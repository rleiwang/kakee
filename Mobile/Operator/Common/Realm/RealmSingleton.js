'use strict';

import realm from 'realm';

import Postal from 'postal';
import Connector from '../Connector';

import BackOrder from './BackOrder';
import BusinessHour from './BusinessHour';
import Category from './Category';
import CityTax from './CityTax';
import EventSource from './EventSource';
import MenuItem from './MenuItem';
import Order from './Order';
import Profile from './Profile';
import PublishedMenu from './PublishedMenu';
import Sequence from './Sequence';
import SpecialOffer from './SpecialOffer';
import LastRegion from './LastRegion';
import Preferences from './Preferences';

let Realm;

const CREATE = 'C';
const UPDATE = 'U';

const TOPIC = {OrderStatus: 'OrderStatus', OrderPaid: 'OrderPaid'};

const SequenceType = {
    EventSource: 0,
    OrderNum: 1
};

function insertEventSource(act, src, evt) {
    // insert into event source
    let seqs = Realm.objects(Sequence.schema.name).filtered('seqTypeId = $0', SequenceType.EventSource);
    let sid = seqs.length == 0 ? 0 : seqs[0].nextId;
    Realm.write(() => {
        Realm.create(Sequence.schema.name, {
            seqTypeId: SequenceType.EventSource,
            nextId: sid + 1
        }, true);
        Realm.create(EventSource.schema.name, {
            seqId: sid,
            timestamp: Date.now(),
            action: act,
            source: src,
            event: JSON.stringify(evt)
        });
    });
    Connector.send({
        seqId: sid,
        ...evt
    })
}

function updateOrder(updates, topic, fromUser) {
    return new Promise((resolve, reject) => {
        try {
            Realm.write(() => Realm.create(Order.schema.name, updates, true));
            const updatedOrder = Realm.objects(Order.schema.name).filtered('orderId = $0', updates.orderId)[0];
            if (fromUser) {
                resolve(updatedOrder);
                return;
            }
            if (updatedOrder.type === RealmSingleton.OrderType.Mobile) {
                insertEventSource(UPDATE, Order.schema.name, {
                    topic: topic,
                    dest: {
                        id: updatedOrder.customerId,
                        channel: 'user'
                    },
                    ...updates
                });
            } else { // site orders
                switch (topic) {
                    case TOPIC.OrderPaid:
                        insertEventSource(CREATE, Order.schema.name, {
                            topic: 'SiteOrder',
                            ...updatedOrder
                        });
                        break;
                    case TOPIC.OrderStatus:
                        insertEventSource(UPDATE, Order.schema.name, {
                            topic: 'SiteOrderStatus',
                            ...updates
                        });
                        break;
                }
            }
            resolve(updatedOrder);
        } catch (e) {
            reject(e);
        }
    });
};

class RealmFacade {
    LastLoginKey = "@Kakee:LastOperatorLogin";
    OrderStatus = {
        Open: 'Open',
        Closed: 'Closed',
        Ready: 'Ready',
        Received: 'Received',
        Pending: 'Pending',
        Canceled: 'Canceled',
        Placed: 'Placed'
    };
    OrderType = {Mobile: 'Mobile', OnSite: 'OnSite'};
    PaymentType = {CASH: 'CS', CARD: 'CC', PAYPAL: 'PP', SQUARE: 'SQ', SQUARE_API: 'SQ_API'};

    get operatorId() {
        return this._operatorId;
    }

    switchToOperator(operatorId) {
        this._operatorId = operatorId;
        if (operatorId) {
            Realm = new realm({
                path: `kakee/${operatorId}.realm`,
                schemaVersion: 7,
                schema: [
                    BackOrder,
                    BusinessHour,
                    Category,
                    CityTax,
                    EventSource,
                    LastRegion,
                    MenuItem,
                    Order,
                    Preferences,
                    Profile,
                    PublishedMenu,
                    Sequence,
                    SpecialOffer
                ],
                migration: (oldRealm, newRealm) => {
                    // only apply this change if upgrading to schemaVersion 1 
                    if (oldRealm.schemaVersion < 6) {
                        let newObjects = newRealm.objects(Profile.schema.name);
                        // loop through all objects and set the name property in the new schem
                        for (let i = 0; i < newObjects.length; i++) {
                            if (!newObjects[i].ccp) {
                                newObjects[i].ccp = this.PaymentType.SQUARE;
                            }
                        }
                    }
                }
            });
        } else {
            Realm = undefined;
        }
    }

    safeDeleteEvent(seqId) {
        Realm.write(() => Realm.delete(Realm.objects(EventSource.schema.name).filtered("seqId = $0", seqId)));
    };

    newOrder(order) {
        return new Promise((resolve, reject) => {
            try {
                Realm.write(() => Realm.create(Order.schema.name, order));
                resolve(order);
            } catch (e) {
                reject(e);
            }
        });
    };

    cleanFailedCreditCardOrders() {
        Realm.write(() => Realm.delete(Realm.objects(Order.schema.name).filtered("orderNum < 0")));
    }

    updateOrderStatus(order, fromUser) {
        return updateOrder(order, TOPIC.OrderStatus, fromUser);
    };

    updateOrderPayments(order, fromUser) {
        return updateOrder(order, TOPIC.OrderPaid, fromUser);
    };

    loadOrders() {
        let orderObj = Realm.objects(Order.schema.name);
        return orderObj.filtered.apply(orderObj, arguments);
    };

    cleanOrderTTL(timestamp) {
        const openStatus = `status = "${this.OrderStatus.Open}"`;
        const readyStatus = `status = "${this.OrderStatus.Ready}"`;
        const staledOrder = Realm.objects(Order.schema.name)
            .filtered(`timestamp <= $0 && !(${openStatus} || ${readyStatus})`, timestamp);
        const staledEventSource = Realm.objects(EventSource.schema.name)
            .filtered('timestamp <= $0', timestamp);
        Realm.write(() => {
            Realm.delete(staledOrder);
            Realm.delete(staledEventSource);
        });
    };

    loadMenuCategory() {
        return Realm.objects(Category.schema.name).sorted('seqNo');
    };

    resetMenuCategory() {
        Realm.write(() => {
            Realm.objects(Category.schema.name).forEach(cat => cat.modified = false);
        });
    };

    saveMenuCategory(categories) {
        Realm.write(() => {
            for (let idx in categories) {
                Realm.create(Category.schema.name, categories[idx], true);
            }
        });
    };

    loadMenuItems() {
        let menuItems = Realm.objects(MenuItem.schema.name);
        return menuItems.filtered.apply(menuItems, arguments).sorted('seqNo');
    };

    saveMenuItems(categoryId, items) {
        Realm.write(() => {
            Realm.delete(Realm.objects(MenuItem.schema.name).filtered("categoryId = $0", categoryId));
            for (let idx in items) {
                Realm.create(MenuItem.schema.name, items[idx]);
            }
        });
    };

    loadPublishedMenu() {
        return Realm.objects(PublishedMenu.schema.name);
    };

    savePublishedMenu(publishedMenu) {
        Realm.write(() => {
            Realm.delete(Realm.objects(PublishedMenu.schema.name));
            Realm.create(PublishedMenu.schema.name, publishedMenu);
        });
    };

    loadCityTax() {
        return Realm.objects(CityTax.schema.name).sorted('versionId', true).slice(0, 1)
    };

    saveCityTax(cityTax) {
        Realm.write(() => {
            Realm.create(CityTax.schema.name, cityTax, true);
        });
    };

    loadBusinessHour() {
        return Realm.objects(BusinessHour.schema.name);
    };

    loadSpecialOffer() {
        return Realm.objects(SpecialOffer.schema.name);
    };

    deleteSpecialOffer(version) {
        return new Promise((resolve, reject) => {
            try {
                Realm.write(() => {
                    Realm.delete(Realm.objects(SpecialOffer.schema.name)
                        .filtered('version = $0', version));
                });
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    };

    saveSpecialOffer(specialOffer) {
        return new Promise((resolve, reject) => {
            try {
                Realm.write(() => {
                    Realm.create(SpecialOffer.schema.name, specialOffer);
                });
                resolve();
            } catch (e) {
                reject(e);
            }
        })
    };

    loadProfile() {
        return Realm.objects(Profile.schema.name);
    };

    saveProfile(profile) {
        return new Promise((resolve, reject) => {
            try {
                Realm.write(() => {
                    Realm.delete(Realm.objects(Profile.schema.name));
                    Realm.create(Profile.schema.name, profile);
                });
                resolve(profile);
            } catch (e) {
                reject(e);
            }
        });
    };

    saveLastRegion(region) {
        return new Promise((resolve, reject) => {
            try {
                Realm.write(() => {
                    Realm.create(LastRegion.schema.name, {lid: 0, ...region}, true);
                });
            } catch (e) {
                reject(e);
            }
        });
    };

    loadLastRegion() {
        let region = Realm.objects(LastRegion.schema.name).filtered("lid = 0");
        return region.length > 0 ? region[0] : null;
    };

    nextOrderNum() {
        let seqs = Realm.objects(Sequence.schema.name).filtered('seqTypeId = $0', SequenceType.OrderNum);
        if (seqs.length > 0) {
            let sid = 0;
            Realm.write(() => {
                sid = seqs[0].nextId++;
            });
            return sid;
        }

        Realm.write(() => {
            Realm.create(Sequence.schema.name, {seqTypeId: SequenceType.OrderNum, nextId: 1});
        });
        return 0;
    };

    getPreferences(key) {
        return Realm.objects(Preferences.schema.name).filtered('key = $0', key);
    };

    savePreferences(key, value) {
        Realm.write(() => {
            Realm.create(Preferences.schema.name, {key: key, value: value}, true);
        });
    };

    deletePreferences(key) {
        Realm.write(() => {
            Realm.delete(Realm.objects(Preferences.schema.name).filtered('key = $0', key));
        });
    };
}

const RealmSingleton = new RealmFacade();

export default RealmSingleton;

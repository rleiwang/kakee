'use strict';

import {
    NativeAppEventEmitter,
    NativeModules
} from 'react-native';

import Postal from 'postal';

const Printer = NativeModules.Printers;

import Connector from '../../Common/Connector';
import Realm from '../../Common/Realm/RealmSingleton';
import Square from './Square';

import Env from 'shared-modules/Env';

class AsyncHandler {
    constructor() {
        this._onMobileOrder();
        this._onPaypalPaid();
        this._onMobileOrderConfirmation();
        this._onCancelMobileOrder();
        this._onSquareCheckout();
        this._onMenuPublished();
        this._onPrinting();
        this._onSafeDeleteEvent();
        this._onMyOrderPending();
        this._nativeSubs = [NativeAppEventEmitter.addListener('PrinterConnected', this._printerConnected.bind(this)),
            NativeAppEventEmitter.addListener('PrinterDisconnected', this._printerDisconnected.bind(this))];

        Printer.searchPrinters()
            .then(printers => {
                if (printers.length > 0) {
                    this._printerConnected();
                }
            })
    }

    _onMobileOrder() {
        const openOrders = Realm.loadOrders(`status = "${Realm.OrderStatus.Open}"`);
        Postal.channel("external").subscribe("MobileOrder", (mobileOrder) => {
            let order = mobileOrder.order;
            order.orderNum = Realm.nextOrderNum() % 100;
            order.customerId = mobileOrder.src.id;
            order.timestamp = Date.now();
            order.type = Realm.OrderType.Mobile;
            order.status = Realm.OrderStatus.Received;

            let ordStatus = {
                topic: 'OrderStatus',
                dest: mobileOrder.src,
                orderId: order.orderId,
                orderNum: order.orderNum,
                refCode: mobileOrder.refCode,
                sequence: mobileOrder.sequence + 1
            };
            Realm.newOrder(order)
                .then(() => Connector.send({
                    ...ordStatus,
                    pending: openOrders.length + 1,
                    status: Realm.OrderStatus.Received
                }))
                .catch((e) => Connector.send({...ordStatus, status: 'Rejected'}));
        })
    }

    _onPaypalPaid() {
        Postal.channel("external").subscribe("PaypalPaid",
            (paypalPaid) => {
                Realm.updateOrderPayments({
                    orderId: paypalPaid.orderId,
                    payments: paypalPaid.payments
                }, true).then(() => Realm.updateOrderStatus({
                    orderId: paypalPaid.orderId,
                    status: Realm.OrderStatus.Open
                }, false)).then(() => Postal.channel("internal").publish("RefreshOrder", {}))
                    .catch(e => console.log(e));
            });
    }

    _onMobileOrderConfirmation() {
        Postal.channel("external").subscribe("OrderConfirmation",
            (confirmation) => {
                Realm.updateOrderStatus({orderId: confirmation.orderId, status: Realm.OrderStatus.Pending})
                    .then(() => Postal.channel("internal").publish("RefreshOrder", {}))
                    .catch(e => console.log(e));
            });
    }

    _onCancelMobileOrder() {
        Postal.channel("external").subscribe("CancelOrder",
            order => {
                Realm.updateOrderStatus({orderId: order.orderId, status: Realm.OrderStatus.Canceled})
                    .then(() => Postal.channel("internal").publish("RefreshOrder", {}))
                    .catch(e => Connector.send({
                        topic: 'CancelOrderError',
                        dest: {
                            id: order.src.id,
                            channel: 'user'
                        },
                        orderId: order.orderId
                    }));
            });
    }

    _onSquareCheckout() {
        Postal.channel("external").subscribe("SquareCheckout",
            (checkout) => Square.checkout(checkout,
                (tx, paid) => Realm.updateOrderPayments({
                    orderId: checkout.orderId,
                    payments: JSON.stringify([{
                        method: Realm.PaymentType.SQUARE_API,
                        paid: paid,
                        timestamp: Date.now(),
                        ...tx
                    }])
                }, false).then(() => Realm.updateOrderStatus({
                    orderId: checkout.orderId,
                    status: Realm.OrderStatus.Open
                }, false)).then(() => Postal.channel("internal").publish("RefreshOrder", {})),
                err => Connector.send({
                    topic: 'SquareTxError',
                    dest: checkout.src,
                    orderId: checkout.orderId,
                    error: err ? JSON.stringify(err) : null
                })
            ));
    }

    _onMenuPublished() {
        Postal.channel("external").subscribe("Menu",
            (menu) => {
                Realm.savePublishedMenu({
                    menuVersionId: menu.version,
                    menu: menu.menu
                });

                Postal.channel("internal").publish("Menu", {
                    menuVersionId: menu.version,
                    menus: JSON.parse(menu.menu).menu
                });
            });
    }

    _onPrinting() {
        Postal.channel("internal").subscribe("Printer",
            async order => {
                try {
                    await Printer.print(order)
                } catch (e) {
                    console.log(e)
                }
            });
    }

    _onSafeDeleteEvent() {
        Postal.channel("external").subscribe("SafeDeleteEvent",
            (event) => {
                try {
                    if (event && event.seqId) {
                        Realm.safeDeleteEvent(event.seqId);
                    }
                } catch (e) {
                    console.log(e);
                }
            });
    }

    _onMyOrderPending() {
        Postal.channel("external").subscribe("MyOrder",
            (myOrder) => {
                try {
                    let order = Realm.loadOrders('orderId = $0', myOrder.orderId);
                    let pending = 0;
                    if (order.length > 1 || order[0].status === Realm.OrderStatus.Open) {
                        pending = Realm.loadOrders(`timestamp <= $0 AND status = "${Realm.OrderStatus.Open}"`,
                            order[0].timestamp).length;
                    }

                    Connector.send({
                        topic: 'MyOrder',
                        dest: myOrder.src,
                        orderId: order[0].orderId,
                        position: pending
                    });
                } catch (e) {
                    console.log(e)
                }
            });
    }

    _printerConnected() {
        Env.isPrinterConnected = true
        Postal.publish({channel: "internal", topic: "PrinterConnection", data: {type: 'Connected'}});
    }

    _printerDisconnected() {
        Env.isPrinterConnected = false;
        Postal.publish({channel: "internal", topic: "PrinterConnection", data: {type: 'Disconnected'}});
    }
}


export default new AsyncHandler();

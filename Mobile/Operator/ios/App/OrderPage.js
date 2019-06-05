'use strict';

import React, {
    Component,
    PropTypes,
} from 'react';

import {
    Alert,
    LayoutAnimation,
    NativeModules,
    StyleSheet,
    Switch,
    Text,
    View,
    ScrollView,
} from 'react-native';

import clone from 'clone';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Menu from 'shared-modules/Menu';
import Receipt from 'shared-modules/Receipt';
import Button from 'shared-modules/Button';
import TSText from 'shared-modules/TSText';
import TSLongTextInput from 'shared-modules/TSLongTextInput';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';
import ChatWindow from 'shared-modules/ChatWindow';
import TSModal from 'shared-modules/TSModal';
import IconNames from 'shared-modules/IconNames';

import Realm from '../../Common/Realm/RealmSingleton';
import Connector from '../../Common/Connector';
import PayPalLogin from './PayPalLogin';
import GeoLocation from '../../Common/GeoLocation';
import CashKeyPad from './CashKeyPad';
import CreditCardView from './CreditCardView';
import OperatorEnv from './OperatorEnv';

const Utils = NativeModules.Utils;

const PAGE = {NEW: 0, ORDER_STATUS: 1, CASH: 2, CREDIT_CARD: 3, CHAT: 4};

class OrderButtons extends Component {
    static propTypes = {
        onChange: PropTypes.func,
        onPrint: PropTypes.func,
        onChat: PropTypes.func,
        rowData: PropTypes.object
    };

    constructor(props) {
        super(props);
    }

    render() {
        let rowData = this.props.rowData;

        let showClose, showReady, showCanceled;
        switch (rowData.status) {
            case Realm.OrderStatus.Open:
                showReady = Realm.OrderStatus.Ready;
                showClose = Realm.OrderStatus.Closed;
            case Realm.OrderStatus.Pending:
                showCanceled = Realm.OrderStatus.Canceled;
                break;
            case Realm.OrderStatus.Ready:
                showReady = rowData.type === Realm.OrderType.Mobile ? Realm.OrderStatus.Ready : undefined;
                showClose = Realm.OrderStatus.Closed;
                showCanceled = Realm.OrderStatus.Canceled;
                break;
        }
        const showChat = rowData.type === Realm.OrderType.Mobile;

        return (
            <View style={[styles.row, styles.marginAround]}>
                <Button onPress={() => this.props.onPrint(rowData)}>
                    <View style={styles.column}>
                        <Ionicons name={IconNames.print} size={50} color={'#5194B9'}/>
                        <TSText fontSize="12" fontNormal={true} color={'#3B709F'}>Print</TSText>
                    </View>
                </Button>
                {showChat &&
                <Button onPress={() => this.props.onChat(rowData.customerId)}>
                    <View style={styles.column}>
                        <Ionicons name={IconNames.chatboxes} size={50} color={'#5194B9'}/>
                        <TSText fontSize="12" fontNormal={true} color={'#3B709F'}>Chat</TSText>
                    </View>
                </Button>}
                {showClose && rowData.payments &&
                <Button onPress={() => this.props.onChange(rowData, showClose)}>
                    <View style={styles.column}>
                        <Ionicons name={IconNames.checkmarkCircle} size={50} color='#5194B9'/>
                        <TSText fontSize="12" fontNormal={true} color="#3B709F">Close</TSText>
                    </View>
                </Button>}
                {showReady &&
                <Button onPress={() => this.props.onChange(rowData, showReady)}>
                    <View style={styles.column}>
                        <Ionicons name={IconNames.notifications} size={50} color='#5194B9'/>
                        <TSText fontSize="12" fontNormal={true} color="#3B709F">Ready</TSText>
                    </View>
                </Button>}
                {showCanceled && !rowData.payments &&
                <Button onPress={() => this.props.onChange(rowData, showCanceled)}>
                    <View style={styles.column}>
                        <Ionicons name={IconNames.closeCircle} size={50} color='#5194B9'/>
                        <TSText fontSize="12" fontNormal={true} color="#3B709F">Cancel</TSText>
                    </View>
                </Button>}
            </View>
        );
    }
}

export default class extends Component {
    static propTypes = {
        cityTax: PropTypes.object,
        publishedMenus: PropTypes.object,
        profile: PropTypes.object,
        onOrderCreated: PropTypes.func,
        navigator: PropTypes.object,
        specialOffer: PropTypes.object
    };

    constructor(props) {
        super(props);
        this.state = {
            order: {taxRate: this.props.cityTax.taxRate},
            showMenu: true,
            publishedMenus: clone(this.props.publishedMenus),
            notes: null,
            noteModal: false,
            pages: [PAGE.NEW]
        };
    }

    reset(callback) {
        this.setState({
            publishedMenus: clone(this.props.publishedMenus),
            order: {taxRate: this.props.cityTax.taxRate},
            notes: null,
            pages: [PAGE.NEW]
        }, callback);
    }

    showOrder(order, callback) {
        this.setState({
            order: order,
            notes: order.notes,
            pages: [PAGE.ORDER_STATUS]
        }, callback);
    }

    // CreditCard tx no order number, will delete order if Tx canceled
    async createOrder(noOrderNumber) {
        if (this.state.order.type === Realm.OrderType.Mobile || this.state.order.orderId) {
            return this.state.order;
        }
        let order = {...this.state.order};
        order.orderId = await Utils.timeUUID();
        order.orderNum = noOrderNumber ? -1 : Realm.nextOrderNum() % 100;
        order.customerId = '';
        order.city = this.props.cityTax.city;
        order.status = Realm.OrderStatus.Open;
        order.timestamp = Date.now();
        if (this.state.notes) {
            order.notes = this.state.notes;
        }

        let mylocation = GeoLocation.whereAmI();
        if (mylocation) {
            order.latitude = mylocation.latitude;
            order.longitude = mylocation.longitude;
        }

        order.menuVersion = this.state.publishedMenus.menuVersion;
        order.menuItems = JSON.stringify({items: order.items});
        return await Realm.newOrder(order);
    }

    async updateOrderPayments(order, orderId, payments, orderNum) {
        try {
            const updates = orderNum ? {
                    orderId: orderId,
                    orderNum: orderNum,
                    payments: payments
                } : {
                    orderId: orderId,
                    payments: payments
                };
            let updatedOrder = await Realm.updateOrderPayments(updates);
            if (order.status === Realm.OrderStatus.Pending) {
                updatedOrder = await Realm.updateOrderStatus({orderId: orderId, status: Realm.OrderStatus.Open}, false);
            }
            this.showOrder(updatedOrder, () => {
                if (this.props.onOrderCreated) {
                    this.props.onOrderCreated(updatedOrder);
                }
            });
        } catch (e) {
            console.log("error createOrder order");
            console.log(e);
        }
    }

    getDiscount() {
        const {specialOffer} = this.props;
        console.log(specialOffer)
        if (specialOffer) {
            let currentTime = Date.now();
            if (currentTime >= specialOffer.startDate && currentTime <= specialOffer.endDate) {
                if ('P' !== specialOffer.type) {
                    return -1 * specialOffer.discount;
                }
            }
        }
        return 0;
    }

    onMenuSelected(order) {
        this.setState({order: Object.assign(this.state.order, order)});
    }

    onNotes(text) {
        let order = {...this.state.order};
        order.notes = text;

        this.setState({order: order});
    }

    _gotoPage(page) {
        if (page) {
            if (page === PAGE.CREDIT_CARD && this.props.profile.ccp === Realm.PaymentType.PAYPAL && !OperatorEnv.isPayPalEnabled) {
                Alert.alert("PayPal login is required", "login now?",
                    [{
                        text: 'Yes', onPress: () => this.props.navigator.push({
                            title: 'PayPalLogin',
                            name: 'PayPalLogin',
                            component: PayPalLogin
                        })
                    }, {text: 'No'}]
                );
                return;
            }
            switch (this.state.pages[this.state.pages.length - 1]) {
                case PAGE.CREDIT_CARD:
                case PAGE.CASH:
                case PAGE.CHAT:
                    this.state.pages.pop();
                    break;
            }
            this.state.pages.push(page);
        } else {
            this.state.pages.pop();
        }

        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);

        this.setState({pages: this.state.pages});
    }

    renderRightContent() {
        switch (this.state.pages[this.state.pages.length - 1]) {
            case PAGE.ORDER_STATUS:
                return null;
            case PAGE.CHAT:
                return <ChatWindow connector={Connector} remote={{id: this._customerId}} remoteChannel={"user"}
                                   onPress={() => this._gotoPage()}/>;
            case PAGE.CASH:
                return <CashKeyPad total={this.state.order.total}
                                   createOrder={this.createOrder.bind(this)}
                                   onPaid={this.updateOrderPayments.bind(this, this.state.order)}
                                   onCancel={() => this._gotoPage()}/>;
            case PAGE.CREDIT_CARD:
                return <CreditCardView navigator={this.props.navigator}
                                       profile={this.props.profile}
                                       createOrder={this.createOrder.bind(this, true)}
                                       onCancel={() => this._gotoPage()}
                                       onPaid={this.updateOrderPayments.bind(this, this.state.order)}/>;
            case PAGE.NEW:
                return (
                    <ScrollView style={styles.container}>
                        <Menu menus={this.state.publishedMenus.menus} taxRate={this.props.cityTax.taxRate}
                              discountPct={this.getDiscount()} onMenuSelected={this.onMenuSelected.bind(this)}/>
                    </ScrollView>
                );
        }
    }

    renderLeftContent() {
        const orderButtons = <OrderButtons rowData={this.state.order}
                                           onChange={this.props.onChange}
                                           onChat={(customerId) => {
                                               this._customerId = customerId;
                                               this._gotoPage(PAGE.CHAT);
                                           }}
                                           onPrint={this.props.onPrint}/>;

        switch (this.state.pages[this.state.pages.length - 1]) {
            case PAGE.ORDER_STATUS:
            case PAGE.CHAT:
                if (this.state.order.payments || this.state.order.status === Realm.OrderStatus.Canceled) {
                    // paid or canceled orders, show create new, otherwise, show payment options
                    return (
                        <View style={styles.marginTop}>
                            {orderButtons}
                            <View style={styles.buttonCreateNew}>
                                <Button onPress={this.reset.bind(this, () => {
                                })}>
                                    <Ionicons
                                        name={IconNames.restaurant}
                                        size={30}
                                        color='#3B709F'
                                    />
                                    <TSText fontNormal={true} color="#3B709F">Create Another Order</TSText>
                                </Button>
                            </View>
                        </View>
                    );
                }
        }

        let disabled = this._isButtonDisabled(this.state.order);
        return (
            <View style={styles.marginTop}>
                {this.state.pages[this.state.pages.length - 1] === PAGE.ORDER_STATUS && orderButtons}
                <View style={styles.row}>
                    <View style={styles.flex1}>
                        <Button disabled={disabled} onPress={() => this._gotoPage(PAGE.CASH)}>
                            <View style={styles.column}>
                                <Ionicons name={IconNames.cash} size={50} color='#5194B9'/>
                                <TSText fontSize="12" fontNormal={true} color="#3B709F">Pay by Cash</TSText>
                            </View>
                        </Button>
                    </View>
                    <View style={styles.flex1}>
                        <Button disabled={disabled} onPress={() => this._gotoPage(PAGE.CREDIT_CARD)}>
                            <View style={styles.column}>
                                <Ionicons name={IconNames.card} size={50} color='#5194B9'/>
                                <TSText fontSize="12" fontNormal={true} color="#3B709F">Pay by Credit Card</TSText>
                            </View>
                        </Button>
                    </View>
                </View>
            </View>
        );
    }

    render() {
        const {pages} = this.state;
        const rightStyle = pages[pages.length - 1] === PAGE.ORDER_STATUS ? {height: 0} :
            [styles.separatorLeft, styles.flex6];
        return (
            <View style={styles.container}>
                <View style={styles.panel}>
                    <View
                        style={pages[pages.length - 1] === PAGE.ORDER_STATUS ? styles.flexCenter : styles.flex4}>
                        <ScrollView>
                            {this.state.order.orderId &&
                            <View style={styles.marginBottom}>
                                <View style={styles.row}>
                                    <TSText fontSize="20" color="#984807">Order #{this.state.order.orderNum}
                                        - {this.state.order.status}</TSText>
                                </View>
                                <View style={styles.row}>
                                    <TSText fontNormal={true}
                                            fontSize="12">{new Date(this.state.order.timestamp).toLocaleString()}</TSText>
                                    {this.state.order.type === "OnSite" ?
                                        <TSText fontNormal={true} fontSize="12"> On Site Order</TSText> :
                                        <TSText fontNormal={true} fontSize="12"> Mobile Order</TSText>}
                                </View>
                            </View>}
                            <Receipt order={this.state.order}>
                                <View style={styles.marginTop}>
                                    {!this.state.order.orderId &&
                                    <TSButtonSecondary label="Special Notes" buttonIconRight="ios-create-outline"
                                                       onPress={() => {
                                                           this.setState({noteModal: true})
                                                       }}/>}
                                    <TSText fontNormal={true} color="#FF0000">
                                        {this._renderPickupTime(this.state.order.pickupTime, this.state.order.notes)}
                                    </TSText>
                                </View>
                            </Receipt>
                            <TSModal visible={this.state.noteModal} width={500} height={500}>
                                <View style={styles.modal}>
                                    <TSLongTextInput placeholder="Special Notes"
                                                     value={this.state.order.notes}
                                                     onChangeText={this.onNotes.bind(this)}/>
                                </View>
                                <Button onPress={() => {
                                    this.setState({noteModal: false})
                                }}
                                        containerStyle={styles.closeButton}>
                                    <Ionicons name="md-checkmark-circle" color="#3B709F" size={40}/>
                                </Button>
                            </TSModal>
                            {this.renderLeftContent()}
                        </ScrollView>
                    </View>
                    <View style={rightStyle}>{this.renderRightContent()}</View>
                </View>
            </View>
        );
    }

    _isButtonDisabled(order) {
        return order.subTotal && order.subTotal > 0 ? false : true;
    }

    _renderPickupTime(pickupTime, notes) {
        if (pickupTime > 0) {
            const d = new Date(pickupTime);
            const min = d.getMinutes();
            const padding = min < 10 ? '0' : '';
            const hr = ((d.getHours() + 11) % 12 + 1);
            const ap = d.getHours() > 11 ? 'pm' : 'am';

            return `Pickup after ${hr}:${padding}${min} ${ap}` + (notes ? `\n${notes}` : '');
        }

        return notes;
    }
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        flex: 1,
    },
    panel: {
        flexDirection: 'row',
        marginTop: 10,
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    separatorLeft: {
        marginLeft: 5,
        marginBottom: 5,
        borderLeftColor: '#A9B1B9',
        borderLeftWidth: 1,
    },
    column: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    flex1: {
        flex: 1,
    },
    flex2: {
        flex: 2,
    },
    flex4: {
        flex: 4,
    },
    flex6: {
        flex: 6,
    },
    marginTop: {
        marginTop: 20,
    },
    buttonCreateNew: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 10,
    },
    marginBottom: {
        marginBottom: 10,
    },
    marginAround: {
        margin: 10,
        justifyContent: 'space-around',
    },
    flexCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modal: {
        margin: 20,
    },
    closeButton: {
        top: -8,
        left: -8,
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0)'
    },
});
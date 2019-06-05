'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Alert,
    Modal,
    NativeAppEventEmitter,
    NativeModules,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';

import Button from 'shared-modules/Button';
import TSText from 'shared-modules/TSText';
import Panel from 'shared-modules/Panel';
import IconNames from 'shared-modules/IconNames';

import Realm from '../../Common/Realm/RealmSingleton';
import Connector from '../../Common/Connector';
import OperatorEnv from './OperatorEnv';

const PayPalProcessor = NativeModules.PaymentProcessor;
const PayPalCardReaders = NativeModules.CardReaders;
const SquareRegister = NativeModules.SquareRegister;

// User clicks CreditCard button, it triggers credit card transaction
// OrderPage will flip to CreditCardView, this View mounts and registers CardEvent Listener
// it call back to OrderPage to initiates the transaction
export default class extends Component {
    static propTypes = {
        profile: PropTypes.object,
        createOrder: PropTypes.func,
        onPaid: PropTypes.func,
        onCancel: PropTypes.func,
        navigator: PropTypes.object
    };

    constructor(props) {
        super(props);
        this._cardEventListener = NativeAppEventEmitter.addListener('CardReaderEvent', this._onEvent.bind(this));
        this.state = {};
    }

    // This View should be called (mounted) for each transaction
    componentDidMount() {
        if (this.props.profile.ccp === Realm.PaymentType.PAYPAL && OperatorEnv.isPayPalEnabled) {
            this._usePayPalCreditCard();
        } else {
            this._useSquare();
        }
    }

    componentWillUnmount() {
        this._cardEventListener.remove();
    }

    render() {
        return (
            <View style={styles.row}>
                <Button onPress={this.props.onCancel} containerStyle={styles.closeButton}>
                    <Ionicons name={IconNames.undo} color="#3B709F" size={40}/>
                </Button>
                <TSText>{this.state.message}</TSText>
                {this._renderReaderInfo(this.state.reader)}
            </View>
        );
    }

    /**
     * { type: 'info',
  reader:
   { firmware: 'M000-MPI-1-34',
     batteryIsLow: false,
     batteryIsCritical: false,
     serialNo: '10066466',
     upgradeIsInitialSetup: false,
     modelNo: 'M010',
     batteryStatus: 'normal',
     name: 'PayPal 466',
     os: 'M000-OS-7-6',
     type: 'ChipAndPinBluetooth',
     upgradeIsAvailable: true,
     batterLevel: 36,
     protocol: 'com.paypal.here.reader',
     upgradeIsManadatory: true,
     isReadyForUpgrade: false,
     family: 'Miura',
     isReadyToTransact: false,
     model: 'MiuraM010',
     batteryIsCharging: false,
     upgradeIsReady: true,
     cardIsInserted: false } }
     * @private
     */
    _renderReaderInfo(reader) {
        if (reader) {
            return (
                <Panel initCollapsed={false}>
                    <View>
                        {reader.upgradeIsManadatory ? <Button onPress={() => PayPalCardReaders.upgrade()}>
                                <Text>upgrade</Text>
                            </Button> : <Text>info</Text>}
                    </View>
                    {Object.keys(reader).map((key, idx) => (
                        <Text key={idx}>{key + ": " + reader[key]}</Text>
                    ))}
                </Panel>
            );
        }
        return null;
    }

    _onEvent(event) {
        this.setState({message: this._cardEventMsg(event)});
    }

    _cardEventMsg(event) {
        switch (event.type) {
            case 'info':
                this.setState({reader: event.reader}, () => {
                    if (event.reader.upgradeIsManadatory) {
                        if (!this._upgrading && !this._askForUpgrade) {
                            this._askForUpgrade = true;
                            Alert.alert(
                                `Card reader software upgrade is required`,
                                'Upgrade now?',
                                [
                                    {
                                        text: 'Yes', onPress: () => {
                                        this._askForUpgrade = undefined;
                                        this._upgrading = true;
                                        PayPalCardReaders.upgrade();
                                    }
                                    },
                                    {text: 'No', onPress: () => this._askForUpgrade = undefined},
                                ]
                            );
                        }
                    }
                });
                break;
            case 'upgrade':
                this._upgrading = undefined;
                if (event.status) {
                    Alert.alert("Upgrade success!");
                } else {
                    Alert.alert("Upgrade failed!", event.message);
                }
                break;
            case 'found':
            case 'starting':
            case 'ready':
            case 'disconnected':
            case 'active':
                return `${event.type} ` + this._readerModelType(event.reader);
            case 'begin':
                PayPalCardReaders.showActiveReader()
                    .then(reader => this.setState({message: "ready " + this._readerModelType(reader)}))
                    .catch(e => this.setState({message: "no card reader connected"}))
        }

        return event.type;
    }

    _readerModelType(reader) {
        if (reader) {
            let model = reader.model ? reader.model : '';
            return `${reader.type} ${model}`;
        }
        return '';
    }

    async _usePayPalCreditCard() {
        let order = await this.props.createOrder();
        try {
            const invoice = this._createInvoice(order);
            const txInfo = await PayPalProcessor.chargeCard(invoice);
            if (txInfo.status === 'Paid') {
                Connector.send({
                    topic: 'PayPalTxInfo',
                    uid: order.customerId,
                    ...txInfo
                }, true);
                this.props.onPaid(txInfo.orderId, JSON.stringify([{
                    method: Realm.PaymentType.CARD,
                    paid: txInfo.details.total,
                    timestamp: Date.now(),
                    ...txInfo
                }]), order.orderNum && order.orderNum > 0 ? undefined : (Realm.nextOrderNum() % 100));
                return;
            } else {
                console.log("txInfo status");
                console.log(txInfo);
            }
        } catch (e) {
            console.log("tx error");
            console.log(e);
        }
        // don't need to Alert, because paypal ui has displayed the error
        this.props.onCancel();
    }

    async _useSquare() {
        const order = await this.props.createOrder();
        let errMsg;
        try {
            const invoice = this._createInvoice(order);
            const txInfo = await SquareRegister.chargeCard(invoice);
            if (txInfo.isSuccess) {
                if (txInfo.orderId === order.orderId) {
                    const finalTxInfo = {
                        txId: txInfo.txId,
                        clientTxId: txInfo.clientTxId,
                        paid: txInfo.paid,
                        orderId: txInfo.orderId
                    };
                    Connector.send({
                        topic: 'SquareTxInfo',
                        uid: order.customerId,
                        ...finalTxInfo
                    }, true);
                    this.props.onPaid(txInfo.orderId, JSON.stringify([{
                        method: Realm.PaymentType.SQUARE,
                        timestamp: Date.now(),
                        ...finalTxInfo
                    }]), order.orderNum && order.orderNum > 0 ? undefined : (Realm.nextOrderNum() % 100));
                    // tx successful
                    return;
                } else {
                    errMsg = 'Processed wrong order!';
                }
            } else {
                errMsg = 'Transaction aborted!';
            }
        } catch (e) {
            errMsg = 'Processing error!';
            console.log(e);
        }
        Alert.alert("Transaction Canceled", errMsg);
        this.props.onCancel();
    }

    _createInvoice(order) {
        let discount = order.hasOwnProperty("discount") ? order.discount : 0;
        return {
            orderId: order.orderId,
            details: this._toItemName(JSON.parse(order.menuItems).items),
            qty: '1',
            // discount is negative number
            unitPrice: numeral(order.subTotal + discount).format('0.00'),
            taxRate: numeral(order.taxRate).format('0.0000')
        };
    }

    // [{"name": "Burrito", "price": "7.00", "quantity": "2", "subItems": [{"name": "Chicken", "price": "1"}, {"name": "Bean"}]},
    //        {"name": "Coke", "price": "1.5", "quantity": "1"}]
    _toItemName(items) {
        return items.reduce((name, item) => {
            if (name.length >= 24) {
                return name;
            }
            const row = item.quantity + ' ' + item.name;
            if (name.length > 0) {
                return name + ',' + row;
            }
            return row;
        }, '');
    }
}

const styles = StyleSheet.create({
    row: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    flex1: {
        flex: 1,
    },
    closeButton: {
        top: 1,
        left: 1,
        position: 'absolute',
        backgroundColor: 'transparent'
    }
});

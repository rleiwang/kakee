'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Alert,
    NativeModules,
    StyleSheet,
    Platform,
    View
} from 'react-native';

import Postal from 'postal';
import numeral from 'numeral';
import * as Animatable from 'react-native-animatable';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

import TSText from 'shared-modules/TSText';
import Receipt from 'shared-modules/Receipt';
import Button from 'shared-modules/Button';
import BusyIndicatorLoader from 'shared-modules/BusyIndicatorLoader';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';

import Connector from './Connector';
import NavigationMap from './NavigationMap';
import SquareForm from './SquareForm';

const Braintree = NativeModules.Braintree;

export default class extends Component {
    static propTypes = {
        truck: PropTypes.object.isRequired,
        order: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
        this._subs = [Postal.channel("external").subscribe("OrderPaid", this._onOrderPaid.bind(this)),
            Postal.channel("external").subscribe("MyOrder", this._onMyOrder.bind(this)),
            Postal.channel("external").subscribe("PaypalPaid", this._onPaypalPaid.bind(this)),
            Postal.channel("external").subscribe("PaypalTxError", this._onTxError.bind(this, 'PayPal')),
            Postal.channel("external").subscribe("SquareTxError", this._onTxError.bind(this, 'Square')),
            Postal.channel("external").subscribe("MemberOffline", this._onMemberOffline.bind(this)),
            Postal.channel("external").subscribe("CancelOrderError", this._onCancelOrderError.bind(this)),
            Postal.channel("external").subscribe("UTSAPaypalToken", this._onUTSAPaypalToken.bind(this))];

        this.state = {
            showPay: !props.order.payments,
            pending: this._getPendingInMount(props.order, props.truck)
        };

        if (this.state.showPay) {
            Connector.send({
                topic: 'UTSQPaypalToken',
                operatorId: props.order.operatorId
            });
        }
    }

    componentWillMount() {
        this._checkMyOrder();
    }

    componentWillUnmount() {
        BusyIndicatorLoader.hide();
        this._subs.forEach(sub => sub.unsubscribe());
    }

    render() {
        const {order} = this.props;
        const isPending = order.status === 'Pending';
        return (
            <View style={styles.container}>
                <View style={styles.row}>
                    <TSText fontNormal={true}>Order #: </TSText>
                    <TSText style={styles.marginRight10}>{order.orderNum}</TSText>
                    <Button onPress={this._gotoNavigationMap.bind(this)}>
                        <FontAwesome name="truck" size={25} color='#3B709F'/>
                    </Button>
                    <View style={styles.flex1}/>
                    {isPending &&
                    <TSButtonPrimary label="Cancel" onPress={this._confirmCancelOrder.bind(this, order)}/>}
                    <View style={styles.marginRight10}/>
                </View>
                <View style={styles.row}>
                    <TSText fontNormal={true}>Order Status: </TSText>
                    <TSText>{order.status + (isPending ? ' Payment' : '')}</TSText>
                </View>
                {order.status === 'Open' &&
                <View style={styles.row}>
                    <TSText fontNormal={true}># of Orders Ahead of You: </TSText>
                    <TSText style={styles.marginRight10}>
                        {this.state.pending > 0 ? this.state.pending - 1 : "unavailable"}
                    </TSText>
                    <Button onPress={this._checkMyOrder.bind(this)}>
                        <Ionicons
                            name="md-refresh"
                            size={25}
                            color='#3B709F'/>
                    </Button>
                </View>}
                <View style={styles.marginBottom10}/>
                {this._renderPaypalButton(order)}
                <View style={styles.marginBottom10}/>
                <View style={styles.rowSeparatorBottom}/>
                <View style={styles.marginBottom10}/>
                <Receipt order={order}>
                    <TSText fontNormal={true} style={styles.marginTop10}>
                        {this._renderPickupTime(order.pickupTime, order.notes)}
                    </TSText>
                </Receipt>
                {this.state.square_form}
            </View>
        );
    }

    _checkMyOrder() {
        if (this.props.order.operatorId && this.props.order.orderId) {
            Connector.send({
                topic: 'MyOrder',
                dest: {
                    id: this.props.order.operatorId,
                    channel: 'operator'
                },
                orderId: this.props.order.orderId
            });
        }
    }

    _onMyOrder(myOrder) {
        if (myOrder.orderId === this.props.order.orderId) {
            this.setState({pending: myOrder.position});
        }
    }

    _renderPaypalButton(order) {

        if (this.state.showPay) {
            let dueFld, payFld;

            dueFld = <TSText color="#FF0000">
                Due {numeral(order.total).format('$0.00')}
            </TSText>;

            if (this.state.token || this.state.square) {
                payFld = <View style={[styles.row, styles.marginRight20]}>
                    <TSText fontNormal={true} style={styles.marginRight10}>Pay by </TSText>
                    {this.state.square &&
                    <Button onPress={this._checkoutWithSquare.bind(this, order, this.state.square)}>
                        <Animatable.View animation="rubberBand" iterationCount="infinite">
                            <View style={styles.column}>
                                <FontAwesome name="credit-card" size={25} color='#3B709F'/>
                                <TSText fontSize="12" fontNormal={true} color="#3B709F">Credit Card</TSText>
                            </View>
                        </Animatable.View>
                    </Button>}
                    {this.state.token && this.state.square &&
                    <TSText fontNormal={true}>or</TSText>}
                    {this.state.token &&
                    <Button onPress={this._checkoutWithPayPal.bind(this, order)}>
                        <Animatable.View animation="rubberBand" iterationCount="infinite">
                            <View style={styles.column}>
                                <FontAwesome name="paypal" size={25} color='#3B709F'/>
                                <TSText fontSize="12" fontNormal={true} color="#3B709F">PayPal</TSText>
                            </View>
                        </Animatable.View>
                    </Button>}
                </View>;
            } else {
                payFld = <TSText fontNormal={true} style={styles.marginRight10}>Pay at pickup</TSText>;
            }

            return (
                <View style={styles.row}>
                    {dueFld}
                    <View style={styles.flex1}/>
                    {payFld}
                </View>
            );
        }
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

    _onUTSAPaypalToken(operatorToken) {
        if (operatorToken.operatorId === this.props.order.operatorId) {
            this.setState({
                token: operatorToken.token,
                accessCode: operatorToken.accessCode,
                square: operatorToken.square
            });
        }
    }

    _checkoutWithSquare(order, square) {
        this.setState({
            square_form: <SquareForm squareAppId={square} amount={numeral(order.total).format('$0,0.00')}
                                     onSuccess={this._onSquareSuccess.bind(this, order)}
                                     onError={this._onSquareError.bind(this, order)}
                                     onCancel={() => this.setState({square_form: undefined})}/>
        });
    }

    _onSquareSuccess(order, nonce) {
        BusyIndicatorLoader.show("");
        this.setState({square_form: undefined},
            () => {
                Connector.send({
                    topic: 'SquareCheckout',
                    dest: {id: order.operatorId, channel: 'operator'},
                    amount: order.total,
                    nonce: nonce,
                    orderId: order.orderId
                });
            }
        );
    }

    _onSquareError(order, error) {

    }

    _checkoutWithPayPal(order) {
        BusyIndicatorLoader.show("Redirecting To PayPal");
        this.setState({disablePayPal: true},
            () => Braintree.checkout({
                token: this.state.token,
                orderId: order.orderId,
                amount: order.total.toString()
            })
                .then(this._checkoutPayPalNonce.bind(this))
                .catch(e => {
                    BusyIndicatorLoader.hide();
                    Alert.alert("error with paypal checkout")
                })
        );
    }

    _checkoutPayPalNonce(nonce) {
        BusyIndicatorLoader.hide();
        if (nonce.status === 'success') {
            if (nonce.orderId === this.props.order.orderId) {
                BusyIndicatorLoader.show("Processing ...");
                this.setState({showPay: false});
                Connector.send({
                    topic: 'PaypalCheckout',
                    accessCode: this.state.accessCode,
                    amount: nonce.amount,
                    nonce: nonce.nonce,
                    orderId: nonce.orderId,
                    operatorId: this.props.order.operatorId
                });
            }
        } else {
            this.setState({disablePayPal: false});
            Alert.alert("Transaction Canceled");
        }
    }

    // paid at site on operator's ipad
    _onOrderPaid(paidOrder) {
        if (paidOrder.orderId === this.props.order.orderId) {
            BusyIndicatorLoader.hide();
            this.setState({showPay: false});
            this._checkMyOrder();
        }
    }

    // paid from user's paypal
    _onPaypalPaid(paidOrder) {
        if (paidOrder.orderId === this.props.order.orderId) {
            BusyIndicatorLoader.hide();
        }
    }

    _onTxError(vendor, txErr) {
        if (txErr.orderId === this.props.order.orderId) {
            BusyIndicatorLoader.hide();
            Alert.alert("Transaction Canceled", `${vendor} Server Communication Error`);
            this.setState({showPay: true});
        }
    }

    _gotoNavigationMap() {
        let truck = {...this.props.truck};
        truck.pending = this.state.pending;
        this.props.navigator.push({
            title: 'NavigationMap',
            name: 'NavigationMap',
            component: NavigationMap,
            passProps: {truck: truck}
        });
    }

    _getPendingInMount(order, truck) {
        if (order.hasOwnProperty('pending')) {
            return order.pending;
        }

        if (truck.hasOwnProperty("waitingLine")) {
            return truck.waitingLine;
        }

        return -1;
    }

    _confirmCancelOrder(order) {
        Alert.alert(
            `Cancel Order #${order.orderNum}?`,
            "",
            [
                {text: 'Yes', onPress: () => this._cancelOrder(order)},
                {text: 'No'}
            ]
        )
    }

    _cancelOrder(order) {
        BusyIndicatorLoader.show(`Cancel order #${order.orderNum}`);
        if (!Connector.send({
                topic: 'CancelOrder',
                dest: {
                    id: order.operatorId,
                    channel: 'operator'
                },
                orderId: order.orderId
            })) {
            BusyIndicatorLoader.hide();
            Alert.alert("Server communication failed!");
        }
    }

    _onCancelOrderError(order) {
        if (order.orderId === this.props.order.orderId) {
            BusyIndicatorLoader.hide();
            Alert.alert('Cancel Order Failed!', 'Please call operator directly or try again later');
        }
    }

    _onMemberOffline(msg) {
        if (msg.mid === this.props.order.operatorId) {
            BusyIndicatorLoader.hide();
            Alert.alert('Operator is currently offline', 'Please call operator directly or try again later');
        }
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        //flexDirection: 'row',
        padding: 5,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    column: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    marginBottom10: {
        marginBottom: 10,
    },
    marginBottom20: {
        marginBottom: 20,
    },
    marginTop10: {
        marginTop: 10,
    },
    marginRight10: {
        marginRight: 10,
    },
    marginRight20: {
        marginRight: 20,
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
    rowSeparatorBottom: {
        borderBottomWidth: 1,
        borderBottomColor: "#A9B1B9",
        marginBottom: 5,
        paddingBottom: 5,
    },
    bannerArea: {
        height: 50,
    }
});
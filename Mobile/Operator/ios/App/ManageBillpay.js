'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Alert,
    ListView,
    NativeModules,
    View,
    StyleSheet,
} from 'react-native';

import DateFormat from 'dateformat';
import Postal from 'postal';
import numeral from 'numeral';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

import TSText from 'shared-modules/TSText';
import Panel from 'shared-modules/Panel';
import Button from 'shared-modules/Button';
import BusyIndicatorLoader from 'shared-modules/BusyIndicatorLoader';

import Connector from '../../Common/Connector';
const Braintree = NativeModules.Braintree;

class TSBillpayRow extends Component {
    render() {

        return (
            <View style={styles.row}>
                <View style={styles.flex4}>
                    <TSText number={true} color={this.props.color}>{this.props.label}</TSText>
                </View>
                <View style={styles.flex2}>
                    <TSText number={true} fontNormal={true}
                            color={this.props.color}>{numeral(this.props.value).format('$0,000.00')}</TSText>
                </View>
                <View style={styles.flex2}/>
            </View>
        )
    }
}

export default class extends Component {
    constructor(props) {
        super(props);
        this._msgSubs = [Postal.channel("external").subscribe("PaypalClientToken", this._onPaypalClientToken.bind(this)),
            Postal.channel("external").subscribe("PaypalTxError", this._onPaypalTxError.bind(this)),
            Postal.channel("external").subscribe("BillPaid", this._onBillPaid.bind(this)),
            Postal.channel("external").subscribe("BillPay", this._onReceivingBills.bind(this))];
        this._ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1.id !== r2.id});
        this.state = {
            count: 0,
            dataSource: this._ds.cloneWithRows([])
        };
        this._callingPayPal = false;
    }

    componentWillMount() {
        Connector.send({topic: 'ViewBills'});
    }

    componentWillUnmount() {
        this._msgSubs.forEach(sub => sub.unsubscribe());
    }

    render() {
        return (
            <View style={styles.container}>
                {this.state.count > 0 ? <ListView enableEmptySections={true}
                                                  dataSource={this.state.dataSource}
                                                  renderRow={this._renderRow.bind(this)}/>
                    : <TSText>No Pending Billpay</TSText>}
            </View>
        );
    }

    //  bills:[{id:, month:, invoice:, sales:, commission:, ads: rate:} ]
    _renderRow(bill) {
        const desc = 'Monthly Service for ' + DateFormat(new Date(bill.month), 'mmmm');
        const total = bill.commission + bill.ads;
        const rate = numeral(bill.rate).format('0.00%');
        return (
            <View style={styles.panel}>
                <Panel initCollapsed={false}>
                    <View style={styles.header}>
                        <View style={styles.row}>
                            <TSText color="#984807">{`${desc} `}
                                <TSText fontNormal={true}>{`Invoice #${bill.invoice}`}</TSText>
                            </TSText>
                        </View>
                    </View>
                    <View>
                        <TSBillpayRow label="Sales" value={bill.sales}/>
                        <TSBillpayRow label={`Commission ${rate}`} value={bill.commission}/>
                        <TSBillpayRow label="Ads Fee" value={bill.ads}/>
                        <TSBillpayRow color="#FF0000" label="Total Service Due" value={total}/>
                        <View style={styles.margin}/>
                        <Button onPress={this._payBill.bind(this, bill, desc, total)}>
                            <View style={styles.column}>
                                <FontAwesome name="paypal" size={40} color={'#3B709F'}/>
                                <TSText fontSize="15" fontNormal={true} color={'#3B709F'}>Pay Bill</TSText>
                            </View>
                        </Button>
                        <View style={styles.column}>
                            <TSText fontSize="12" fontNormal={true} color="#FF0000">
                                *Payment due upon receiving. Thank you!
                            </TSText>
                        </View>
                    </View>
                </Panel>
            </View>
        );
    }

    _onReceivingBills(billPay) {
        if (billPay) {
            this.setState({
                count: billPay.bills.length,
                dataSource: this._ds.cloneWithRows(billPay.bills)
            }, () => {
                if (this.state.count > 0) {
                    Connector.send({topic: 'PaypalClientToken'});
                }
            });
        }
    }

    _payBill(bill, desc, amount) {
        BusyIndicatorLoader.show("processing ...");
        if (this._paypalToken && !this._callingPayPal) {
            this._callingPayPal = true;
            Braintree.checkout({
                    token: this._paypalToken,
                    orderId: bill.id,
                    amount: amount.toString()
                })
                .then(nonce => this._checkoutNonce(bill, desc, nonce))
                .catch(e => this._processError(bill, e));
        }
    }

    _onPaypalClientToken(clientToken) {
        this._paypalToken = clientToken.token;
    }

    _checkoutNonce(bill, desc, nonce) {
        this._callingPayPal = false;
        BusyIndicatorLoader.hide();
        if (nonce.status === 'success') {
            if (nonce.orderId === bill.id) {
                BusyIndicatorLoader.show("Processing ...");
                Connector.send({
                    topic: 'PayBills',
                    nonce: nonce.nonce,
                    amount: nonce.amount,
                    billId: bill.id,
                    invoice: bill.invoice,
                    desc: desc
                })
            }
        } else {
            Alert.alert("Transaction Canceled");
        }
    }

    _processError(bill, e) {
        BusyIndicatorLoader.hide();
        this._callingPayPal = false;
        Alert.alert(`network error of processing Invoice #${bill.invoice}, please try again later`);
    }

    _onBillPaid(billPaid) {
        BusyIndicatorLoader.hide();
        if (billPaid.paid) {
            Alert.alert("Thanks for your payment, reference code is " + billPaid.txId);
        } else {
            Alert.alert("There is an error in processing your payment, please try again");
        }
        Connector.send({topic: 'ViewBills'});
    }

    _onPaypalTxError() {
        BusyIndicatorLoader.hide();
        Alert.alert("There is an error in processing your payment, please try again");
    }
}

const styles = StyleSheet.create({
    header: {
        marginTop: 5,
        marginBottom: 5,
    },
    row: {
        flexDirection: 'row',
        //alignItems: 'center',
    },
    column: {
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 10,
    },
    margin: {
        marginTop: 20,
    },
    panel: {
        borderBottomWidth: 2,
        borderBottomColor: "#A9B1B9",
        marginBottom: 5,
        paddingBottom: 5,
        marginRight: 5,
        marginLeft: 5,
    },
    flex1: {
        flex: 1,
    },
    flex2: {
        flex: 2,
    },
    flex4: {
        flex: 4,
    }
});
'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    StyleSheet,
    Text,
    View
} from 'react-native';

import Button from 'shared-modules/Button';
import TSText from 'shared-modules/TSText';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Realm from '../../Common/Realm/RealmSingleton';
import numeral from 'numeral';

export default class extends Component {
    static propTypes = {
        createOrder: PropTypes.func,
        onPaid: PropTypes.func,
        onCancel: PropTypes.func,
    };

    constructor(props) {
        super(props);
        this.state = {
            keyboards: [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], [".", "0", "Clear"]],
            textTender: '',
            change: 0,
            buttonDisabled: true
        };
    }

    render() {
        return (
            <View style={styles.innerContainer}>
                <View style={styles.flexRow}>
                    <View style={styles.flex3}><TSText number={true} fontSize="25">Tender</TSText></View>
                    <View style={styles.flex2}><TSText number={true}
                                                       fontSize="25">{'$' + this.state.textTender}</TSText></View>
                    <View style={styles.flex2}/>
                </View>
                <View style={styles.flexRow}>
                    <View style={styles.flex3}><TSText number={true} fontSize="25">Change</TSText></View>
                    <View style={styles.flex2}>
                        <TSText number={true} fontSize="25">{numeral(this.state.change).format('$0.00')}</TSText>
                    </View>
                    <View style={styles.flex2}/>
                </View>
                <View style={[styles.margin10, styles.alignCenter]}>
                    <View>
                        {this.state.keyboards.map((rowKeys, rowIdx) =>
                            <View key={rowIdx} style={styles.row}>{
                                rowKeys.map((cell, cellIdx) =>
                                    <View style={styles.btnMargin} key={`${rowIdx}-${cellIdx}`}>
                                        <Button onPress={this._handleTender.bind(this, cell)}>
                                            <View style={styles.btn}>
                                                {cell == "Clear" ?
                                                    <Ionicons name="md-arrow-back" size={25} color="#ECECEC"/> :
                                                    <TSText color="#ECECEC">{cell}</TSText>}
                                            </View>
                                        </Button>
                                    </View>)}
                            </View>)}
                    </View>
                    <View style={[styles.row]}>
                        <View style={[styles.flex1, styles.marginAround]}>
                            <Button onPress={this.props.onCancel}>
                                <View style={styles.column}>
                                    <Ionicons name="md-close-circle" size={70} color="#3B709F"/>
                                    <TSText fontSize="12" fontNormal={true} color="#3B709F">Cancel</TSText>
                                </View>
                            </Button>
                        </View>
                        <View style={[styles.flex1, styles.marginAround]}>
                            <Button onPress={this._payByCash.bind(this)}>
                                <View style={styles.column}>
                                    <Ionicons name="md-checkmark-circle" size={70} color="#3B709F"/>
                                    <TSText fontSize="12" fontNormal={true} color="#3B709F">Paid</TSText>
                                </View>
                            </Button>
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    async _payByCash() {
        try {
            let order = await this.props.createOrder();
            this.props.onPaid(order.orderId, JSON.stringify([{
                method: Realm.PaymentType.CASH,
                paid: order.total,
                timestamp: Date.now()
            }]));
        } catch (e) {
            console.log("error cash pay");
            console.log(e);
        }
    }

    _handleTender(text) {
        let textTender = this.state.textTender;
        if (text === 'Clear') {
            if (this.state.textTender.length > 0) {
                textTender = this.state.textTender.slice(0, -1);
            }
        } else {
            textTender += text;
        }

        let tender = textTender.length > 0 ? numeral().unformat(textTender) : 0;
        tender = Number(+tender.toFixed(2));
        let change = tender - this.props.total;
        this.setState({textTender: textTender, change: change, buttonDisabled: tender <= 0 || change < 0});
    }
}

const styles = StyleSheet.create({
    innerContainer: {
        marginTop: 10,
        flex: 1,
        //flexDirection: 'row',
        //justifyContent: 'center',
        //alignItems: 'center',
    },
    alignCenter: {
        alignItems: 'center',
    },
    flexRow: {
        flexDirection: 'row',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    column: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    flex: {
        flex: 1,
    },
    flex2: {
        flex: 2,
    },
    flex3: {
        flex: 3,
    },
    flex4: {
        flex: 4,
    },
    flex5: {
        flex: 5,
    },
    flex6: {
        flex: 6,
    },
    btnMargin: {
        margin: 10,
    },
    btn: {
        backgroundColor: '#3B709F',
        justifyContent: 'center',
        alignItems: 'center',
        height: 80,
        width: 80,
        borderRadius: 40,
    },
    marginAround: {
        margin: 10,
        //justifyContent: 'space-around',
    },
    margin10: {
        marginTop: 10,
    },
});

'use strict';

import React, {
    Component,
    PropTypes,
} from 'react';

import {
    StyleSheet,
    Text,
    View
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import numeral from 'numeral';

import Panel from './Panel';
import Button from './Button';
import TSText from './TSText';

export default class extends Component {
    static propTypes = {
        order: PropTypes.object
    };

    constructor(props) {
        super(props);
    }

    // JSON - {"items": [{"name": "Buritto", "price": "7.00", "quantity": "2", "subItems": [{"name": "Chicken", "price": "1"}, {"name": "Bean"}]},
    //        {"name": "Coke", "price": "1.5", "quantity": "1"}]}
    render() {
        let {order} = this.props;
        const orderedItems = this._orderedItems(order);
        const payments = order.payments && order.payments.length > 0 ? JSON.parse(order.payments) : undefined;
        order.paid = payments ? payments.reduce((prev, curr) => prev + curr.paid, 0) : 0;
        let due = (order.total ? order.total : 0) - (order.paid ? order.paid : 0);

        return (
            <View style={styles.marginLeft}>
                {order.orderId &&
                <View style={styles.row}>
                    <TSText fontNormal={true} fontSize="12">{`Invoice #: ${order.orderId}`}</TSText>
                </View>}
                {orderedItems.map((item, idx) =>
                    <Panel key={`item-${idx}`}>
                        {/* this is header */}
                        <View style={[styles.row]}>
                            <View style={styles.flex1}>
                                <TSText number={true}>{item.quantity}</TSText>
                            </View>
                            <View style={styles.flex8}>
                                <TSText>{item.name}</TSText>
                            </View>
                            <View style={styles.flex3}>
                                <TSText number={true}>{numeral(item.price).format('$0.00')}</TSText>
                            </View>
                        </View>
                        {/* this is body */}
                        {item.hasOwnProperty("subItems") && <View>{
                            Object.keys(item.subItems).map(subItem =>
                                <View key={`${idx}-${subItem}`} style={[styles.row]}>
                                    <View style={styles.flex1}/>
                                    <View style={styles.flex8}>
                                        <View style={styles.marginLeft}>
                                            <TSText fontNormal={true}>{item.subItems[subItem].name}</TSText>
                                        </View>
                                    </View>
                                    <View style={styles.flex3}>
                                        {item.subItems[subItem].price > 0 && <TSText fontNormal={true} number={true}>
                                            {numeral(item.subItems[subItem].price).format('$0.00')}
                                        </TSText>}
                                    </View>
                                </View>
                            )}</View>}
                    </Panel>
                )}
                {orderedItems.length > 0 && <View style={styles.rowSeparatorTop}/>}
                <View style={styles.row}>
                    <View style={styles.flex6}>
                        <TSText number={true}>Subtotal</TSText>
                    </View>
                    <View style={styles.flex4}>
                        <TSText number={true}>
                            {numeral(order.subTotal).format('$0.00')}
                        </TSText>
                    </View>
                </View>
                {order.hasOwnProperty("discount") && order.discount.toFixed(2) != 0 && <View style={styles.row}>
                    <View style={styles.flex6}>
                        <TSText number={true}>Discount</TSText>
                    </View>
                    <View style={styles.flex4}>
                        <TSText number={true}>
                            {numeral(order.discount).format('($0.00)')}
                        </TSText>
                    </View>
                </View>}
                <View style={styles.row}>
                    <View style={styles.flex6}>
                        <TSText number={true}>Tax {numeral(order.taxRate).format('0.00%')}</TSText>
                    </View>
                    <View style={styles.flex4}>
                        <TSText number={true}>
                            {numeral(order.tax).format('$0.00')}
                        </TSText>
                    </View>
                </View>
                <View style={styles.row}>
                    <View style={styles.flex6}>
                        <TSText number={true}>Total</TSText>
                    </View>
                    <View style={styles.flex4}>
                        <TSText number={true}> {numeral(order.total).format('$0.00')} </TSText>
                    </View>
                </View>
                {(typeof order.total != 'undefined') && order.total.toFixed(2) > 0 && this._renderDueOrPaid(due, payments)}
                {this.props.children}
            </View>
        );
    }

    _renderDueOrPaid(due, payments) {
        return due.toFixed(2) == 0 ?
            <TSText number={true}>{this._renderPaidBy(payments)}</TSText>
            :
            <View style={styles.row}>
                <View style={styles.flex6}>
                    <TSText number={true} color="#FF0000">Due</TSText>
                </View>
                <View style={styles.flex4}>
                    {due.toFixed(2) != 0 &&
                    <TSText number={true} color="#FF0000">{numeral(due).format('$0.00')}</TSText>}
                </View>
            </View>;
    }

    _renderPaidBy(payments) {
        return payments ? payments.reduce((prev, curr, idx) => {
            const method = this._method(curr.method);
            if (idx > 0) {
                return prev + ',' + method;
            }
            return prev + method;
        }, 'Paid By ') : 'Paid';
    }

    _orderedItems(order) {
        let orderedItems = [];
        if (order.items) {
            orderedItems = order.items;
        } else if (order.menuItems) {
            const menuItems = JSON.parse(order.menuItems)
            if (menuItems.hasOwnProperty("items")) {
                orderedItems = menuItems.items;
            }
        }
        return orderedItems;
    }

    _method(method) {
        switch (method) {
            case 'CS':
                return 'Cash';
            case 'CC':
            case 'SQ':
            case 'SQ_API':
                return 'Credit Card';
            case 'PP':
                return 'PayPal';
        }

        return '';
    }
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        //alignItems: 'center',
        //justifyContent: 'center',
    },
    flex1: {
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
    flex6: {
        flex: 6,
    },
    flex8: {
        flex: 8,
    },
    flex9: {
        flex: 9,
    },
    marginLeft: {
        marginLeft: 10,
    },
    rowSeparatorTop: {
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: "#A9B1B9",
    }
});

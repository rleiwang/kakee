'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    DatePickerIOS,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Alert,
} from 'react-native';

import Postal from 'postal';
import numeral from 'numeral';
import clone from 'clone';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Receipt from 'shared-modules/Receipt';
import IconNames from 'shared-modules/IconNames';
import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import Panel from 'shared-modules/Panel';
import Button from 'shared-modules/Button';
import Connector from '../../Common/Connector';
import TSModal from 'shared-modules/TSModal';

class SalesGridHeader extends Component {
    render() {
        return (
            <View style={styles.headerRow}>
                <View style={styles.flex5}><TSText color="#A9B1B9">Item Name</TSText></View>
                <View style={styles.flex2}><TSText color="#A9B1B9">Quantity Sold</TSText></View>
            </View>
        );
    }
}

class HistoryGridHeader extends Component {
    render() {
        return (
            <View style={styles.headerRow}>
                <View style={styles.flex1}><TSText color="#A9B1B9">Order</TSText></View>
                <View style={styles.flex3}><TSText color="#A9B1B9">Date/Time</TSText></View>
                <View style={styles.flex2}><TSText color="#A9B1B9">Type</TSText></View>
                <View style={styles.flex2}><TSText color="#A9B1B9">Status</TSText></View>
                <View style={styles.flex2}><TSText number={true} color="#A9B1B9">Subtotal</TSText></View>
                <View style={styles.flex2}><TSText number={true} color="#A9B1B9">Discount</TSText></View>
                <View style={styles.flex2}><TSText number={true} color="#A9B1B9">Tax</TSText></View>
                <View style={styles.flex2}><TSText number={true} color="#A9B1B9">Total</TSText></View>
            </View>
        );
    }
}

export default class extends Component {
    static propTypes = {};

    constructor(props) {
        super(props);
        this._subs = [Postal.channel("external").subscribe("SalesReport", this.onSalesReport.bind(this)),
            Postal.channel("external").subscribe("HistoryReport", this.onHistoryReport.bind(this))];

        let today = new Date();
        let startOfDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        let endOfDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        this.state = {
            fromDate: startOfDate,
            toDate: endOfDate,
            salesReportModal: false,
            historyReportModal: false,
        }
    }

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    }

    render() {
        const hdrButtons = [{
            "buttonPosition": "R",
            "buttonIcon": IconNames.home,
            onPress: () => this.props.navigator.pop()
        }];
        return (
            <View style={styles.container}>
                <TSHeader headerTitle='Reports' buttons={hdrButtons}/>
                <View style={styles.content}>
                    <View style={styles.row}>
                        <View style={[styles.column, styles.flex1]}>
                            <TSText>From Date</TSText>
                            <DatePickerIOS
                                date={this.state.fromDate}
                                mode="date"
                                onDateChange={this.onFromDateChange.bind(this)}/>
                        </View>
                        <View style={[styles.column, styles.flex1]}>
                            <TSText>To Date</TSText>
                            <DatePickerIOS
                                date={this.state.toDate}
                                mode="date"
                                onDateChange={this.onToDateChange.bind(this)}/>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <TSButtonPrimary label="Sales Report" onPress={this.generateReport.bind(this, 'Sales')}/>
                        <View style={styles.marginLeft}/>
                        <TSButtonPrimary label="Order History Report"
                                         onPress={this.generateReport.bind(this, 'History')}/>
                    </View>
                    <TSModal visible={this.state.salesReportModal} width={600} height={700}>
                        <View style={styles.alignCenter}>
                            <TSText style={styles.reportTitle}>Sales Report</TSText>
                            <TSText style={styles.reportTitle}>{this.state.fromDate.toLocaleDateString()}
                                - {this.state.toDate.toLocaleDateString()}</TSText>
                        </View>
                        <ScrollView style={styles.content}>
                            <SalesGridHeader/>
                            {this.state.salesReportModal && this.renderSalesItems(this.state.items)}
                        </ScrollView>
                        <Button onPress={() => {this.setState({salesReportModal: false})}}
                                containerStyle={{top: -10, left: -10, position: 'absolute', backgroundColor: 'rgba(0,0,0,0)',}}>
                            <Ionicons name="ios-close-circle" color="#3B709F" size={40}/>
                        </Button>
                    </TSModal>
                    <TSModal visible={this.state.historyReportModal} width={950} height={700}>
                        <View style={styles.alignCenter}>
                            <TSText style={styles.reportTitle}>Order History Report</TSText>
                            <TSText style={styles.reportTitle}>{this.state.fromDate.toLocaleDateString()}
                                - {this.state.toDate.toLocaleDateString()}</TSText>
                        </View>
                        {this.state.historyReportModal && <View style={styles.content}>
                            <View style={styles.summaryRow}>
                                <View style={styles.flex8}>
                                    <TSText number={true} color="#984807">Summary</TSText>
                                </View>
                                <View style={styles.flex2}>
                                    <TSText number={true}
                                            color="#984807">{numeral(this.state.report.summary.subTotal).format('$0.00')}</TSText>
                                </View>
                                <View style={styles.flex2}>
                                    <TSText number={true}
                                            color="#984807">{numeral(this.state.report.summary.discount).format('$0.00')}</TSText>
                                </View>
                                <View style={styles.flex2}>
                                    <TSText number={true}
                                            color="#984807">{numeral(this.state.report.summary.tax).format('$0.00')}</TSText>
                                </View>
                                <View style={styles.flex2}>
                                    <TSText number={true}
                                            color="#984807">{numeral(this.state.report.summary.total).format('$0.00')}</TSText>
                                </View>
                            </View>
                            <HistoryGridHeader/>
                            <ScrollView>
                                {this.renderHistoryItems(this.state.report)}
                            </ScrollView>
                        </View>}
                        <Button onPress={() => {this.setState({historyReportModal: false})}}
                                containerStyle={{top: -10, left: -10, position: 'absolute', backgroundColor: 'rgba(0,0,0,0)',}}>
                            <Ionicons name="md-close-circle" color="#3B709F" size={40}/>
                        </Button>
                    </TSModal>
                </View>
            </View>
        );
    }

    generateReport(type) {
        Connector.send({
            topic: 'Report',
            type: type,
            after: this.state.fromDate.getTime(),
            before: this.state.toDate.getTime()
        });
    }

    /**
     *
     * <pre>
     * {
 *	  orders:
 *	   { Dddggfgfgf: { name: 'Dddggfgfgf', quantity: 1, price: 0, subItems: {} },
 *	     Burrito:
 *	      { name: 'Burrito',
 *	        quantity: 52,
 *	        price: 1040,
 *	        subItems:
 *	         { Gfg: { name: 'Gfg', quantity: 2, price: 0, subItems: {} },
 *	           Beff: { name: 'Beff', quantity: 2, price: 0, subItems: {} } } } },
 *	  topic: 'SalesReport' }
     *</pre>
     */
    onSalesReport(report) {
        if (Object.keys(report.orders).length === 0) {
            Alert.alert("No sales report", "Adjust the date range and try again.");
            return;
        }

        this.setState({
            report: report,
            items: report.orders,
            salesReportModal: true,
        });
    }

    /**
     * <pre>
     *     { topic: 'HistoryReport',
	  summary: { subTotal: 500, tax: 42.5, total: 542.5, discount: 0 },
	  history:
	   [ { orderId: '4b575030-3902-11e6-b1b3-b33f9ab9dcc2',
	       orderNum: 75,
	       type: 'Mobile',
	       subTotal: 40,
	       taxRate: 0.085,
	       tax: 3.4,
	       total: 43.4,
	       discount: 0 },]

     *     </pre>
     *
     * @param report
     */
    onHistoryReport(report) {
        if (report.history.length === 0) {
            Alert.alert("No history report", "Adjust the date range and try again.");
            return;
        }

        this.setState({
            report: report,
            historyReportModal: true,
        });
    }

    renderSalesItems(items) {
        return Object.keys(items).map((key, idx) => {
            let item = items[key];
            return (
                <Panel key={`item-${idx}`}>
                    <View style={styles.dataRow}>
                        <View style={styles.flex5}>
                            <TSText>{item.name}</TSText>
                        </View>
                        <View style={styles.flex2}>
                            <TSText number={true}>{item.quantity}</TSText>
                        </View>
                    </View>
                    <View>
                        {item.hasOwnProperty("subItems") && this.renderSalesSubItems(item.subItems, idx)}
                    </View>
                </Panel>
            );
        });
    }

    renderSalesSubItems(subItems, subIdx) {
        return Object.keys(subItems).map((key, idx) => {
            let subItem = subItems[key];
            return (
                <View key={`${subIdx}-${idx}`} style={styles.dataRow}>
                    <View style={styles.flex5}>
                        <TSText fontNormal={true} style={styles.marginLeft}>{subItem.name}</TSText>
                    </View>
                    <View style={styles.flex2}>
                        <TSText fontNormal={true} number={true}>{subItem.quantity}</TSText>
                    </View>
                </View>
            );
        });
    }

    /**
     * <pre>
     *     { topic: 'HistoryReport',
	  summary: { subTotal: 500, tax: 42.5, total: 542.5, discount: 0 },
	  history:
	   [ { orderId: '4b575030-3902-11e6-b1b3-b33f9ab9dcc2',
	       orderNum: 75,
	       type: 'Mobile',
	       subTotal: 40,
	       taxRate: 0.085,
	       tax: 3.4,
	       total: 43.4,
	       discount: 0 },]

     *     </pre>
     *
     * @param report
     */
    renderHistoryItems(report) {
        //for (let i = 0; i < report.history.length; i++) {
        return report.history.map((order, idx) => {
            const canceledStyle = order.status === 'Canceled' ? {textDecorationLine: 'line-through'} : undefined;
            return (
                <Panel initCollapsed={true} key={idx}>
                    <View style={styles.dataRow}>
                        <View style={styles.flex1}>
                            <TSText style={canceledStyle}>{order.orderNum}</TSText>
                        </View>
                        <View style={styles.flex3}>
                            <TSText fontNormal={true} style={canceledStyle}>
                                {new Date(order.timestamp).toLocaleString()}
                            </TSText>
                        </View>
                        <View style={styles.flex2}>
                            <TSText fontNormal={true} style={canceledStyle}>{order.type}</TSText>
                        </View>
                        <View style={styles.flex2}>
                            <TSText fontNormal={true} style={canceledStyle}>{order.status}</TSText>
                        </View>
                        <View style={styles.flex2}>
                            <TSText fontNormal={true} number={true} style={canceledStyle}>
                                {numeral(order.subTotal).format('$0.00')}
                            </TSText>
                        </View>
                        <View style={styles.flex2}>
                            <TSText fontNormal={true} number={true} style={canceledStyle}>
                                {numeral(order.discount).format('$0.00')}
                            </TSText>
                        </View>
                        <View style={styles.flex2}>
                            <TSText fontNormal={true} number={true} style={canceledStyle}>
                                {numeral(order.tax).format('$0.00')}
                            </TSText>
                        </View>
                        <View style={styles.flex2}>
                            <TSText fontNormal={true} number={true} style={canceledStyle}>
                                {numeral(order.total).format('$0.00')}
                            </TSText>
                        </View>
                    </View>
                    <View style={styles.receipt}>
                        <View style={styles.flex2}/>
                        <View style={styles.flex4}>
                            <Receipt order={order}/>
                        </View>
                        <View style={styles.flex2}/>
                    </View>
                </Panel>
            );
        });
    }

    onFromDateChange(date) {
        let startOfDate = date;
        startOfDate.setHours(0, 0, 0, 0);

        this.setState({fromDate: startOfDate});
    }

    onToDateChange(date) {
        let endOfDate = date;
        endOfDate.setHours(23, 59, 59, 999);

        this.setState({toDate: endOfDate});
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        margin: 10,
    },
    row: {
        flexDirection: 'row',
    },
    column: {
        flexDirection: 'column',
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
    flex5: {
        flex: 5,
    },
    flex8: {
        flex: 8,
    },
    marginLeft: {
        marginLeft: 40,
    },
    alignCenter: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    reportTitle: {
        fontSize: 20,
        color: '#984807',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5A5B5D',
        marginTop: 4,
        //padding: 0,
        //marginBottom: 0,
    },
    receipt: {
        flexDirection: 'row',
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: '#ECECEC',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    dataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        padding: 0,
        //marginLeft: 4,
        //marginRight: 4,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: '#ECECEC',
    },
});

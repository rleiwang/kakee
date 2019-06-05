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
import TSText from 'shared-modules/TSText';
import Panel from 'shared-modules/Panel';
import Button from 'shared-modules/Button';
import Connector from '../../Common/Connector';
import TSModal from 'shared-modules/TSModal';

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
    static propTypes = {
        title: PropTypes.string,
        subTitle: PropTypes.string,
        report: PropTypes.object.isRequired,
        onClose: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {}
    }

    render() {
        return (
            <TSModal visible={true} width={950} height={700}>
                <View style={styles.alignCenter}>
                    {this.props.title && <TSText style={styles.reportTitle}>{this.props.title}</TSText>}
                    {this.props.subTitle && <TSText style={styles.reportTitle}>{this.props.subTitle}</TSText>}
                </View>
                <View style={styles.content}>
                    <View style={styles.summaryRow}>
                        <View style={styles.flex8}>
                            <TSText number={true} color="#984807">Summary</TSText>
                        </View>
                        <View style={styles.flex2}>
                            <TSText number={true}
                                    color="#984807">{numeral(this.props.report.summary.subTotal).format('$0.00')}</TSText>
                        </View>
                        <View style={styles.flex2}>
                            <TSText number={true}
                                    color="#984807">{numeral(this.props.report.summary.discount).format('$0.00')}</TSText>
                        </View>
                        <View style={styles.flex2}>
                            <TSText number={true}
                                    color="#984807">{numeral(this.props.report.summary.tax).format('$0.00')}</TSText>
                        </View>
                        <View style={styles.flex2}>
                            <TSText number={true}
                                    color="#984807">{numeral(this.props.report.summary.total).format('$0.00')}</TSText>
                        </View>
                    </View>
                    <HistoryGridHeader/>
                    <ScrollView>
                        {this.renderHistoryItems(this.props.report)}
                    </ScrollView>
                </View>
                <Button onPress={this.props.onClose}
                        containerStyle={{top: -10, left: -10, position: 'absolute', backgroundColor: 'rgba(0,0,0,0)',}}>
                    <Ionicons name="ios-close-circle" color="#3B709F" size={40}/>
                </Button>
            </TSModal>
        );
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

'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Image,
    TouchableHighlight,
    StyleSheet,
    Text,
    View,
    ScrollView,
} from 'react-native';

import {
    ListView
} from 'realm/react-native';

import numeral from 'numeral';
import Ionicons from 'react-native-vector-icons/Ionicons';

import IconNames from 'shared-modules/IconNames';
import TSText from 'shared-modules/TSText';
import Button from 'shared-modules/Button';

import Realm from '../../Common/Realm/RealmSingleton';
import PickupCountDownTimer from './PickupCountDownTimer';

class RowHeader extends Component {
    render() {
        return (
            <TouchableHighlight underlayColor="#A9B1B9" onPress={this._onPressRow.bind(this, this.props.order)}>
                <View style={[styles.row, styles.rowSeparatorBottom]}>
                    <View style={styles.panelBarPaddingLeft}>
                        {this.props.order.type === "OnSite" ?
                            <TSText fontSize='25' color='#984807'>#{this.props.order.orderNum}</TSText> :
                            <TSText fontSize='25' color='#984807'>#M{this.props.order.orderNum}</TSText>}
                    </View>
                    <Ionicons name="ios-paper-outline" size={25} color={'#3B709F'}/>
                    <View style={styles.flex1}/>
                    <View style={styles.panelBarPaddingRight}>
                        {this.props.order.status === Realm.OrderStatus.Open &&
                        <TSText fontNormal={true}>{this.props.numItems} Item</TSText>}
                    </View>
                </View>
            </TouchableHighlight>
        );
    }

    _onPressRow(order) {
        if (this.props.onShowOrder) {
            this.props.onShowOrder(order);
        }
    }
}

export default class  extends Component {
    static propTypes = {
        onChange: PropTypes.func,
        onPrint: PropTypes.func,
        onShowOrder: PropTypes.func,
        orders: PropTypes.object
    };

    constructor(props) {
        super(props);
        this._ds = new ListView.DataSource({rowHasChanged: (a, b) => a.orderId !== b.orderId});
        this.state = {
            dataSource: this._ds.cloneWithRows({})
        }
    }

    componentDidMount() {
        this.setState({dataSource: this._ds.cloneWithRows(this.props.orders)});
    }

    componentWillReceiveProps(props) {
        this.setState({
            dataSource: this._ds.cloneWithRows(props.orders)
        });
    }

    render() {
        return (
            // ListView wraps ScrollView and so takes on its properties.
            // With that in mind you can use the ScrollView's contentContainerStyle prop to style the items.
            <ListView
                contentContainerStyle={styles.list}
                dataSource={this.state.dataSource}
                enableEmptySections={true}
                initialListSize={5}
                pageSize={4} // should be a multiple of the no. of visible cells per row
                scrollRenderAheadDistance={500}
                renderRow={this._renderRow.bind(this)}
            />
        );
    }

    _extractPaid(rowData) {
        if (rowData.hasOwnProperty("paid")) {
            return rowData.paid;
        } else if (rowData.hasOwnProperty("payments") && rowData.payments) {
            return JSON.parse(rowData.payments)[0].paid;
        }

        return 0;
    }

    _renderRow(rowData, sectionID, rowID) {
        let due = rowData.total - this._extractPaid(rowData);
        let dueField = due.toFixed(2) == 0 ? "Paid" : "Due " + numeral(due).format('$0.00');
        let renderFunc = rowData.status === Realm.OrderStatus.Open ?
            this._renderOrderDetails.bind(this) : this._renderOrderSummary.bind(this);

        let showClose, showReady;
        switch (rowData.status) {
            case Realm.OrderStatus.Open:
                showReady = Realm.OrderStatus.Ready;
                break;
            case Realm.OrderStatus.Ready:
                showClose = Realm.OrderStatus.Closed;
                break;
        }

        return (
            <View style={[styles.orderPanel,
                rowData.status === Realm.OrderStatus.Open && styles.openOrderPanel,
                rowData.type === "OnSite" && styles.onSiteOrderPanel]}>
                {renderFunc(rowData, due, dueField)}
                <View style={[styles.row, styles.marginAround]}>
                    <Button onPress={() => this.props.onPrint(rowData)}>
                        <View style={styles.column}>
                            <Ionicons name={IconNames.print} size={25} color={'#3B709F'}/>
                            <TSText fontSize="12" fontNormal={true} color={'#3B709F'}>Print</TSText>
                        </View>
                    </Button>
                    {showClose && dueField === "Paid" &&
                    <Button onPress={() => this.props.onChange(rowData, showClose)}>
                        <View style={styles.column}>
                            <Ionicons name={IconNames.checkmarkCircle} size={25} color='#3B709F'/>
                            <TSText fontSize="12" fontNormal={true} color="#3B709F">Close</TSText>
                        </View>
                    </Button>}
                    {showReady &&
                    <Button onPress={() => this.props.onChange(rowData, showReady)}>
                        <View style={styles.column}>
                            <Ionicons name={IconNames.notifications} size={25} color='#3B709F'/>
                            <TSText fontSize="12" fontNormal={true} color="#3B709F">Ready</TSText>
                        </View>
                    </Button>}
                </View>
            </View>
        )
    }

    _renderOrderSummary(order, due, dueField) {
        let totalField = "Total " + numeral(order.total).format('$0.00');
        return (
            <View>
                <RowHeader order={order} onShowOrder={this.props.onShowOrder}/>
                {due.toFixed(2) == 0 ?
                    <TSText fontSize="25">{dueField}</TSText> :
                    <TSText fontSize="25" color="#FF0000">{dueField}</TSText>}
                <TSText/>
                <TSText>{totalField}</TSText>
            </View>
        );
    }

    _renderOrderDetails(order, due, dueField) {
        const pickupTimerView = order.pickupTime > 0 ?
            <View>
                {order.pickupTime > 0 && <PickupCountDownTimer order={order}/>}
            </View> : undefined;
        const noteView = order.notes ?
            <View>
                <TSText fontNormal={true} color="#FF0000">{order.notes}</TSText>
            </View> : undefined;

        let numItems = 0;
        let detailView;
        if (order.menuItems) {
            const items = JSON.parse(order.menuItems);
            if (items.hasOwnProperty("items")) {
                detailView = items.items.map((item, idx) => {
                    let subItemView;

                    numItems += parseInt(item.quantity);

                    if (item.hasOwnProperty("subItems")) {
                        subItemView = Object.keys(item.subItems).map(subItem => {
                            return (
                                <View key={`${idx}-${subItem}`} style={[styles.row]}>
                                    <View style={styles.flex3}/>
                                    <View style={styles.flex7}>
                                        <TSText fontNormal={true}>{item.subItems[subItem].name}</TSText>
                                    </View>
                                </View>
                            );
                        })
                    }
                    return (
                        <View key={idx}>
                            <View style={styles.row}>
                                <View style={styles.flex2}>
                                    <TSText
                                        number={true}>{item.quantity && item.quantity > 0 ? item.quantity : ""}</TSText>
                                </View>
                                <View style={styles.flex8}>
                                    <TSText>{item.name}</TSText>
                                </View>
                            </View>
                            {subItemView}
                        </View>

                    );
                });
            }
            return (
                <View style={styles.flex1}>
                    <RowHeader order={order} numItems={numItems} onShowOrder={this.props.onShowOrder}/>
                    <ScrollView>
                        {pickupTimerView}
                        {noteView}
                        {detailView}
                        <View style={[styles.row, styles.rowDue]}>
                            <View style={styles.flex1}/>
                            {due.toFixed(2) == 0 ? <TSText>{dueField}</TSText> :
                                <TSText color="#FF0000">{dueField}</TSText>}
                        </View>
                    </ScrollView>
                </View>
            );
        }
    }
}

const styles = StyleSheet.create({
    list: {
        //justifyContent: 'space-around',
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    column: {
        flexDirection: 'column',
        alignItems: 'center',
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
    flex7: {
        flex: 7,
    },
    flex8: {
        flex: 8,
    },
    orderPanel: {
        margin: 2,
        width: 190,
        height: 160,
        backgroundColor: '#EDE7D6',
    },
    openOrderPanel: {
        height: 300,
    },
    onSiteOrderPanel: {
        backgroundColor: '#ECECEC',
    },
    marginAround: {
        margin: 10,
        justifyContent: 'space-around',
    },
    rowSeparatorBottom: {
        borderBottomWidth: 1,
        borderBottomColor: "#A9B1B9",
    },
    rowDue: {
        borderTopWidth: 1,
        borderTopColor: "#A9B1B9",
        marginLeft: 10,
        marginRight: 10,
    },
    panelBarPaddingRight: {
        paddingRight: 5,
    },
    panelBarPaddingLeft: {
        paddingLeft: 5,
    },
});


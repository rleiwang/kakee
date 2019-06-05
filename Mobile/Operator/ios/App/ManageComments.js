'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Alert,
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableHighlight,
} from 'react-native';

import Postal from 'postal';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ChatSummary from 'shared-modules/ChatSummary';
import ChatWindow from 'shared-modules/ChatWindow';
import IconNames from 'shared-modules/IconNames';
import Button from 'shared-modules/Button';
import Connector from '../../Common/Connector';
import HistoryReportModal from './HistoryReportModal';

const PAGE = {Summary: 'S', Detail: 'D'};

export default class extends Component {
    static propTypes = {
        conversations: PropTypes.array,
        onRead: PropTypes.func
    };

    constructor(props) {
        super(props);

        this._subs = [Postal.channel("external").subscribe("HistoryReport", this._onHistoryReport.bind(this))];


        this.state = {page: PAGE.Summary};
    }

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    }

    render() {
        switch (this.state.page) {
            case PAGE.Summary:
                return <ChatSummary conversations={this.props.conversations} onRead={this._onRead.bind(this)}/>;
            case PAGE.Detail:
                return (
                    <View style={{flex: 1}}>
                        <ChatWindow connector={Connector} remoteChannel={"user"} remote={this.state.remote}
                                    onPress={this._doneRead.bind(this)}/>
                        <Button onPress={() => this._genCustomerOrderHistoryReport()}
                                containerStyle={{top: 0, right: 0, position: 'absolute', backgroundColor: 'rgba(0,0,0,0)',}}>
                            <Ionicons name={IconNames.listBox} color="#3B709F" size={40}/>
                        </Button>
                        {this.state.customOrderHistory}
                    </View>
                );
        }
    }

    _onRead(unread) {
        this.setState({remote: unread, page: PAGE.Detail}, ()=> this.props.onRead(unread));
    }

    _doneRead() {
        this.setState({page: PAGE.Summary});
    }

    _genCustomerOrderHistoryReport() {
        Connector.send({
            topic: 'Report',
            type: 'Customer',
            customerId: this.state.remote.id
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
    _onHistoryReport(report) {
        if (report.history.length === 0) {
            Alert.alert("No customer order history");
            return;
        }

        this.setState({
            customOrderHistory: <HistoryReportModal onClose={() => this.setState({customOrderHistory: undefined})}
                                                    report={report}/>
        });
    }
}
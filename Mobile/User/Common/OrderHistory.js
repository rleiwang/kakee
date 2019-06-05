'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    ListView,
    View,
    StyleSheet,
} from 'react-native';

import Postal from 'postal';
import Button from 'shared-modules/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';

import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import Receipt from 'shared-modules/Receipt';
import Panel from 'shared-modules/Panel';
import IconNames from 'shared-modules/IconNames';
import Connector from './Connector';
import Comments from './Comments';

class FavoriteIcon extends Comments {
    static propTypes = {
        operator: PropTypes.object,
    };

    constructor(props) {
        super(props);
        this.subs = [Postal.channel("FavoriteIcon").subscribe("FavoriteIcon", this._onChange.bind(this))];
        this.state = {
            favorite: props.operator.favorite
        };
    }

    render() {
        const favoriteIcon = this.state.favorite ? "ios-heart" : "ios-heart-outline";
        return (
            <Button onPress={this.handleFavorite.bind(this, this.props.operator)}>
                <Ionicons name={favoriteIcon} size={30} color='#5194B9'/>
                <TSText fontNormal={true} fontSize="12">Favorite</TSText>
            </Button>
        );
    }

    handleFavorite(operator) {
        operator.favorite = !operator.favorite;
        Connector.send({
            topic: 'PreferenceAction',
            type: 'FAVORITE',
            operatorId: operator.operatorId,
            add: operator.favorite
        });

        Postal.publish({
            channel: "FavoriteIcon",
            topic: 'FavoriteIcon',
            data: operator
        });
    }

    _onChange(operator) {
        if (operator.operatorId === this.props.operator.operatorId) {
            this.setState({favorite: operator.favorite});
        }
    }
}

export default class extends Component {
    constructor(props) {
        super(props);
        this._operators = {};
        this._msgSubs = [Postal.channel("external").subscribe("OrderHistory", this._onOrderHistory.bind(this))];
        this._ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1.order.orderId !== r2.order.orderId});
        this.state = {
            records: [],
            dataSource: this._ds.cloneWithRows([])
        };
    }

    componentWillMount() {
        Connector.send({topic: 'OrderHistory'});
    }

    componentWillUnmount() {
        this._msgSubs.forEach(sub => sub.unsubscribe());
    }

    render() {
        const buttons = [{
            "buttonPosition": "L",
            "buttonIcon": IconNames.arrowBack,
            onPress: () => {
                this.props.navigator.pop();
            }
        }, {
            "buttonPosition": "R",
            "buttonIcon": IconNames.home,
            onPress: () => this.props.navigator.popToTop()
        }];

        return (
            <View style={styles.container}>
                <TSHeader headerTitle="Order History" buttons={buttons} hideConnection={true}/>
                {this.state.records.length > 0 ? <ListView enableEmptySections={true}
                                                           dataSource={this.state.dataSource}
                                                           renderRow={this._renderRow.bind(this)}/>
                    : <TSText>No Order History</TSText>}
            </View>
        );
    }

    //  records:[ {timestamp: long, order: {} }]
    _renderRow(record) {
        const operator = this._operators[record.order.operatorId];

        return (
            <View style={styles.panel}>
                <Panel initCollapsed={true}>
                    <View style={styles.header}>
                        <View style={styles.row}>
                            <TSText
                                color="#984807">{`${operator.name} Order #${record.order.orderNum} - ${record.order.status}`}</TSText>
                        </View>
                        <View style={styles.row}>
                            {operator.phone &&
                            <TSText fontNormal={true} fontSize="14">{operator.phone}</TSText>}
                            {record.timestamp && <TSText fontNormal={true}
                                                         fontSize="12">{new Date(record.timestamp).toLocaleString()}</TSText>}
                        </View>
                    </View>
                    <View>
                        <View style={styles.row}>
                            <View/>
                            <View style={styles.flex1}/>
                            <Button onPress={this.handleComments.bind(this, operator)}>
                                <Ionicons name="ios-chatboxes-outline" size={30} color='#5194B9'/>
                                <TSText fontNormal={true} fontSize="12">Chat</TSText>
                            </Button>
                            <View style={styles.marginLeft}/>
                            <View style={styles.marginLeft}/>
                            <FavoriteIcon operator={operator}/>
                        </View>
                        <Receipt order={record.order}/>
                    </View>
                </Panel>
            </View>
        );
    }

    handleComments(operator) {
        this.props.navigator.push({
            title: 'Comments',
            name: 'Comments',
            component: Comments,
            passProps: {
                truck: operator
            }
        });
    }

    /**
     * <pre>
     *      records:
     [ { timestamp: 1466614681569,
	       order: {}
	   }
     ],   operators:
     { operatorId: {} }
     * </pre>
     * @param history
     * @private
     */
    _onOrderHistory(history) {
        Object.assign(this._operators, history.operators);
        let records = this.state.records.concat(history.records);
        this.setState({
            records: records,
            dataSource: this._ds.cloneWithRows(records)
        })
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
    marginLeft: {
        marginLeft: 5,
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
});

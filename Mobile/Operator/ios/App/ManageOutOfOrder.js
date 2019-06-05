'use strict';

import React,{
    Component,
    PropTypes
} from 'react';

import {
    Alert,
    InteractionManager,
    StyleSheet,
    View,
    ScrollView,
    Text,
    TouchableHighlight,
} from 'react-native';

import Postal from 'postal';
import Ionicons from 'react-native-vector-icons/Ionicons';

import TSText from 'shared-modules/TSText';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';

import Button from 'shared-modules/Button';
import Realm from '../../Common/Realm/RealmSingleton';
import Connector from '../../Common/Connector';

class GridHeader extends Component {
    render() {
        return (
            <View style={styles.headerRow}>
                <View style={styles.flex2}><Text style={styles.columnLabel}>Category</Text></View>
                <View style={styles.flex4}><Text style={styles.columnLabel}>Name</Text></View>
                <View style={styles.flex4}><Text style={styles.columnLabel}>Description</Text></View>
                <View style={styles.flex1}><Text style={styles.columnLabel}>Group</Text></View>
            </View>
        );
    }
}

class GridRow extends Component {
    static propTypes = {
        rowData: PropTypes.object,
        isSubItem: PropTypes.bool
    };

    constructor(props) {
        super(props)
    }

    render() {
        let nameStyle;
        if (this.props.isSubItem) {
            nameStyle = {marginLeft: 50};
        }

        let oooStyle;
        if (this.props.rowData.isOOO) {
            oooStyle = {textDecorationLine: 'line-through', color: '#FF0000'};
        }

        return (
            <TouchableHighlight style={styles.tapRow} underlayColor="#A9B1B9" onPress={this.props.onPress}>
                <View style={styles.dataRow}>
                    <View style={styles.flex2}>
                        <TSText style={oooStyle}>{this.props.rowData.category}</TSText>
                    </View>
                    <View style={[styles.flex4, nameStyle]}>
                        <TSText fontNormal={true} style={oooStyle}>{this.props.rowData.name}</TSText>
                    </View>
                    <View style={styles.flex4}>
                        <TSText fontNormal={true} style={oooStyle}>{this.props.rowData.descr}</TSText>
                    </View>
                    <View style={styles.flex1}>
                        <TSText fontNormal={true} style={oooStyle}>{this.props.rowData["group"]}</TSText>
                    </View>
                </View>
            </TouchableHighlight>
        );
    }
}

module.exports = React.createClass({

    getInitialState() {
        return {
            saveWarning: false,
            badgeOOO: 0,
        };
    },

    componentWillMount() {
        InteractionManager.runAfterInteractions(() => {
            this.loadProdMenuFromDB(Realm.loadPublishedMenu());
        });
        this.setState({
            subs: [Postal.channel("external").subscribe("OutOfOrder", this.saveOutOfOrder)]
        })
    },

    componentWillUnmount() {
        this.state.subs.forEach(sub => sub.unsubscribe());
    },

    loadProdMenuFromDB(data) {
        if (data && data.length > 0) {
            this.setState({
                menuVersionId: data[0].menuVersionId,
                menus: JSON.parse(data[0].menu).menu
            });
        } else {
            Alert.alert("Error", "No published menu!  Set up menu first then publish.");
        }
    },

    handleClearAll() {
        if (this.state.menus) {
            this.state.menus.forEach(item => {
                delete item.isOOO;
                if (item.hasOwnProperty("subItems")) {
                    Object.keys(item.subItems).forEach(key => delete item.subItems[key].isOOO);
                }
            });
            this.setState({menus: this.state.menus, badgeOOO: 0});
            this.props.onChange(true);
        }
    },

    publishOutOfOrder() {
        if (this.state.menuVersionId && this.state.menus) {
            Connector.send({
                topic: 'OutOfOrder',
                version: this.state.menuVersionId,
                menu: JSON.stringify({menu: this.state.menus})
            });

            this.props.onChange(false, this.state.badgeOOO);
        }
    },

    saveOutOfOrder(oooMenu) {
        console.log(oooMenu);
        if (oooMenu.updated) {
            Realm.savePublishedMenu({
                menuVersionId: oooMenu.version,
                menu: oooMenu.menu
            });
            Alert.alert("Saved");
        } else {
            Alert.alert("Failed to publish Out Of Order");
        }
    },

    markOutOfOrderItem(item) {
        item.isOOO = item.isOOO ? false : true;
        if (item.hasOwnProperty("subItems")) {
            Object.keys(item.subItems).forEach(key => item.subItems[key].isOOO = item.isOOO);
        }

        let badgeOOO = 0;
        for (let item of this.state.menus) {
            if (item.isOOO) {
                badgeOOO++;
            } else {

                if (item.hasOwnProperty("subItems")) {
                    for (let key in item.subItems) {
                        if (item.subItems[key].isOOO) {
                            badgeOOO++;
                        }
                    }
                }
            }
        }

        this.props.onChange(true);
        this.setState({menus: this.state.menus, badgeOOO: badgeOOO});
    },

    render() {
        let rows;
        if (this.state.menus) {
            rows = this.state.menus.map((item, idx, items) => {
                let category = item.categoryId;
                if (idx > 0 && category === items[idx - 1].category) {
                    category = '';
                }
                let subItems;
                if (item.hasOwnProperty("subItems")) {
                    subItems = Object.keys(item.subItems).map((key, keyIdx) => {
                        let rowId = `${idx}-${keyIdx}`;
                        return <GridRow key={rowId}
                                        rowIndex={rowId}
                                        rowData={item.subItems[key]}
                                        isSubItem={true}
                                        onPress={this.markOutOfOrderItem.bind(this, item.subItems[key])}
                        />
                    });
                }

                return (
                    <View key={idx}>
                        <GridRow rowIndex={idx}
                                 rowData={item}
                                 isSubItem={false}
                                 category={category}
                                 onPress={this.markOutOfOrderItem.bind(this, item)}
                        />
                        {subItems}
                    </View>
                );
            });
        }

        return (
            <View style={styles.container}>
                <TSText>Select Item(s) Currently Out Of Order</TSText>
                <ScrollView>
                    <GridHeader />
                    {rows}
                </ScrollView>
                <View style={[styles.row, styles.marginTop]}>
                    <TSButtonSecondary label="Clear All" onPress={this.handleClearAll}/>
                    <View style={styles.flex1}/>
                    <TSButtonPrimary label="Save & Publish" onPress={this.publishOutOfOrder}/>
                </View>
            </View>
        );
    }
});

var styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 5,
        paddingTop: 20,
    },
    row: {
        flexDirection: 'row',
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
    flex5: {
        flex: 5,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5A5B5D',
        margin: 4,
        padding: 0,
        marginBottom: 0,
    },
    columnLabel: {
        margin: 2,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#A9B1B9',
        textAlign: 'left',
    },
    dataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        padding: 0,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: '#ECECEC',
    },
    tapRow: {
        marginLeft: 4,
        marginRight: 4,
    },
    icon: {
        alignSelf: 'center',
        width: 10,
        height: 10,
    },
    text: {
        fontSize: 18,
        //color: '#5A5B5D',
        color: '#5194B9',
    },
    marginTop: {
        marginTop: 10,
    }
});

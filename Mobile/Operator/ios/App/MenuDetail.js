'use strict';

import React from 'react';

import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Alert,
    TouchableHighlight,
} from 'react-native';

import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import TSHeader from 'shared-modules/TSHeader';
import TSTextInput from 'shared-modules/TSTextInput';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';
import IconNames from 'shared-modules/IconNames';

import Realm from '../../Common/Realm/RealmSingleton';

var GridHeader = React.createClass({
    render() {
        return (
            <View style={styles.headerRow}>
                <View style={styles.flex1}><Text style={styles.columnLabel}>Select</Text></View>
                <View style={styles.flex1}><TouchableHighlight onPress={this.props.onPress}><Text
                    style={styles.columnLabel}>Group</Text></TouchableHighlight></View>
                <View style={styles.flex2}><Text style={styles.columnLabel}>Name</Text></View>
                <View style={styles.flex3}><Text style={styles.columnLabel}>Description</Text></View>
                <View style={styles.flex1}><Text style={styles.columnLabel}>Price$</Text></View>
                <View style={styles.flex1}><Text style={styles.columnLabel}>Minim Order</Text></View>
                {/*<View style={styles.flex1}><Text style={styles.columnLabel}>Out of Order</Text></View>*/}
                <View style={styles.flex2}></View>
            </View>
        );
    }
});

var GridRow = React.createClass({

    handleSelectRow() {
        this.props.onPress("SelectRow");
    },

    handleAddSubItem() {
        this.props.onPress("AddSubItem");
    },

    render() {

        var rowStyle;
        if (this.props.rowIndex == this.props.selectedRow) {
            rowStyle = [styles.dataRow, styles.highlight];
        } else {
            rowStyle = styles.dataRow;
        }

        // cannot autoformat to decimal 2, it will mess up text update.
        /*var priceString = this.props.rowData["price"]? this.props.rowData["price"] : "0";
         var price = parseFloat(Number(priceString) * 100 /100).toFixed(2);
         priceString = (price == 0)? "" : price.toString();*/

        return (
            <View style={rowStyle}>
                <View style={styles.flex1}>
                    <TSButtonSecondary onPress={this.handleSelectRow}/>
                </View>
                <View style={styles.flex1}>
                    {this.props.subItem && <TSTextInput subItem={this.props.subItem}
                                                        value={this.props.rowData["group"]}
                                                        onChangeText={(text)=>{this.props.onChangeText("group", text)}}
                    />}
                </View>
                <View style={styles.flex2}>
                    <TSTextInput subItem={this.props.subItem}
                                 value={this.props.rowData["name"]}
                                 onChangeText={(text)=>{this.props.onChangeText("name", text)}}
                    />
                </View>
                <View style={styles.flex3}>
                    <TSTextInput subItem={this.props.subItem}
                                 value={this.props.rowData["descr"]}
                                 onChangeText={(text)=>{this.props.onChangeText("descr", text)}}
                    />
                </View>
                <View style={styles.flex1}>
                    <TSTextInput subItem={this.props.subItem}
                                 keyboardType='decimal-pad'
                                 value={this.props.rowData["price"]}
                                 onChangeText={(text)=>{this.props.onChangeText("price", text)}}
                    />
                </View>
                <View style={styles.flex1}>
                    <TSTextInput subItem={this.props.subItem}
                                 keyboardType='numeric'
                                 value={this.props.rowData["minOrder"]}
                                 onChangeText={(text)=>{this.props.onChangeText("minOrder", text)}}
                    />
                </View>
                {/*<View style={styles.flex1}>
                 <TSButtonSecondary imageIcon={this.props.rowData['outOfOrder']? require("image!home") : null}
                 onPress={this.handleOutOfOrder}/>
                 </View>*/}
                <View style={styles.flex2}>
                    {!this.props.subItem &&
                    <TSButtonSecondary label='Add Sub Item' onPress={this.handleAddSubItem}/>}
                </View>
            </View>
        );
    }
});

module.exports = React.createClass({

    getInitialState() {
        return {
            saveWarning: false,
            categoryName: "",
            selectedRow: -1,
            nextItemId: 0,
            /*rows: [{"itemId": 0, "name": "Taco", "descr": "Taco descr", "price": "7.45"},
             {"itemId": 1, "subItem": true, "group": "1", "name": "Beef", "descr": "Beef Taco", "outOfOrder": true},
             {"itemId": 2, "subItem": true, "group": "1", "name": "Chicken", "descr": "Chicken Taco"}],*/
            rows: [],
        };
    },

    componentWillMount() {
        this.state.categoryName = this.props.categoryName;

        this.loadMenuItemsFromDB(Realm.loadMenuItems("isParent = true AND categoryId = " + this.props.categoryId));
    },

    loadMenuItemsFromDB(data) {

        var maxItemId = 0;
        // itemId contains both categoryId and itemId to make it unique.
        // the lower 8 bits are categoryId, the rest are itemId.
        var parseItemId;
        var rowsFromDB = [];
        var newRow;
        for (var i = 0, len = data.length; i < len; i++) {
            newRow = {};
            newRow.itemId = data[i].itemId;

            if ((newRow.itemId >>> 8) > maxItemId) {
                maxItemId = newRow.itemId >>> 8;
            }

            newRow.categoryId = data[i].categoryId;
            newRow.seqNo = data[i].seqNo;
            newRow.name = data[i].name;
            newRow.descr = data[i].descr;
            newRow.price = data[i].price;
            newRow.minOrder = data[i].minOrder;
            newRow.subItem = false;
            rowsFromDB.push(newRow);
            if (data[i].hasOwnProperty("subItems")) {
                for (var si = 0, slen = data[i].subItems.length; si < slen; si++) {
                    newRow = {};
                    newRow.subItem = true;
                    newRow.itemId = data[i].subItems[si].itemId;
                    parseItemId = newRow.itemId >>> 8;
                    if (parseItemId > maxItemId) {
                        maxItemId = parseItemId;
                    }
                    newRow.categoryId = data[i].subItems[si].categoryId;
                    newRow.seqNo = data[i].subItems[si].seqNo;
                    newRow.name = data[i].subItems[si].name;
                    newRow.descr = data[i].subItems[si].descr;
                    newRow.price = data[i].subItems[si].price;
                    newRow.group = data[i].subItems[si].group;
                    newRow.minOrder = data[i].subItems[si].minOrder;
                    rowsFromDB.push(newRow);
                }
            }
        }

        this.setState({rows: rowsFromDB, nextItemId: maxItemId + 1,});
    },

    handleSave() {

        if (!this.state.saveWarning) { //nothing to save
            return;
        }

        // validation
        if (this.state.categoryName == "") {
            Alert.alert("Error", "Category cannot be empty");
            return;
        }

        // save the menu items
        var output = [];
        var oIdx = -1;
        var rows = this.state.rows;
        for (var i = 0, len = rows.length; i < len; i++) {
            if (!rows[i].name) {
                Alert.alert("Error", "Item name cannot be empty");
                return;
            }
            var obj;
            if (!rows[i].subItem) {
                output.push({});
                oIdx += 1;
                obj = output[oIdx];
                obj.isParent = true;
            } else {
                if (!output[oIdx].hasOwnProperty("subItems")) {
                    output[oIdx].subItems = [];
                }
                output[oIdx].subItems.push({});
                var cIdx = output[oIdx].subItems.length - 1;
                obj = output[oIdx].subItems[cIdx];
                obj.isParent = false;
            }
            obj.itemId = rows[i].itemId;
            obj.categoryId = rows[i].categoryId;
            obj.seqNo = i;
            rows[i].seqNo = i;
            obj.name = rows[i].name;
            obj.descr = rows[i].descr;
            obj.price = rows[i].price;
            obj.group = rows[i].group;
            obj.minOrder = rows[i].minOrder;
        }

        Realm.saveMenuItems(this.props.categoryId, output);

        // save the category
        var category = {};
        category.categoryId = this.props.categoryId;
        category.seqNo = this.props.categorySeqNo;
        category.name = this.state.categoryName;
        category.modified = true;
        Realm.saveMenuCategory([category]);

        this.handleDbSaved();
    },

    handleDbSaved() {

        this.setState({
            saveWarning: false,
            selectedRow: -1,
        });

        Alert.alert("Saved");
    },

    showGroupHelp() {
        Alert.alert("Group Setup", "If customer can only order one sub item from a group, " +
            "then make sure to set up the Sub Items under the same Group name.");
    },

    handleCategoryNameChanged(text) {
        this.setState({
            categoryName: text,
            saveWarning: true,
        });
    },

    handleCancel() {

        if (this.state.saveWarning) {
            Alert.alert(
                '',
                'Cancel will leave the page and lose all unsaved data. Are you sure?',
                [
                    {text: 'Yes', onPress: () => this.props.navigator.pop()},
                    {text: 'No'},
                ]
            );
        } else {
            /* back to category page without saving */
            this.props.navigator.pop();
        }
    },

    handleAddItem() {
        /* add a new item after selected row, otherwise, add to the bottom */
        var updObj = this.state.rows;
        var row = {
            "itemId": (this.state.nextItemId << 8) + this.props.categoryId,
            "categoryId": this.props.categoryId
        };

        if (this.state.selectedRow == -1 || this.state.selectedRow == this.state.rows.length - 1) {
            updObj.push(row);
        } else {
            updObj.splice(this.state.selectedRow + 1, 0, row);
        }

        this.setState({
            rows: updObj,
            nextItemId: this.state.nextItemId + 1,
        });
    },

    handleRowAction(rowIndex, action) {

        if (action == 'SelectRow') {
            if (this.state.selectedRow == rowIndex) {
                this.setState({selectedRow: -1});
            } else {
                this.setState({selectedRow: rowIndex});
            }

            return;
        }

        if (action == "AddSubItem") {
            /* add sub item to the end of the item */
            var updObj = this.state.rows;
            var row = {
                "itemId": (this.state.nextItemId << 8) + this.props.categoryId,
                "categoryId": this.props.categoryId, "subItem": true
            };
            var ind;

            if (rowIndex == updObj.length - 1) {
                updObj.splice(rowIndex + 1, 0, row);
            } else {
                for (var i = rowIndex + 1; i < updObj.length; i++) {
                    if (!updObj[i]["subItem"]) {
                        ind = i;
                        break;
                    }
                }

                if (ind == undefined) {
                    ind = updObj.length + 1;
                }

                // insert row at position ind
                updObj.splice(ind, 0, row);
            }

            this.setState({
                rows: updObj,
                nextItemId: this.state.nextItemId + 1,
            });

            return;
        }

    },

    /* update row input text cells */
    handleUpdateRow(rowIndex, id, value) {

        var updObj = this.state.rows;
        var row = updObj[rowIndex];

        if (id == "price") {
            if (isNaN(value)) {
                Alert.alert("Error", "Price is a invalid number.");
                return;
            }
        }

        if (id == "minOrder") {
            if (isNaN(value)) {
                Alert.alert("Error", "Minim Order is a invalid number.");
                return;
            }
        }

        /* id stores the properties of row, such as name, descr, etc. Associate array */
        row[id] = value;

        this.setState({
            rows: updObj,
            saveWarning: true,
        });
    },

    handleDeleteRow() {
        if (this.state.selectedRow == -1) {
            Alert.alert("Tap the Select column to select a row first");
            return;
        }

        var updObj = this.state.rows;

        if (this.state.selectedRow == 0) { /* delete first row */
            updObj.shift();
        } else {
            if (this.state.selectedRow == updObj.length - 1) { /* delete the last row */
                updObj.pop();
            } else {
                var arr1 = updObj.slice(0, this.state.selectedRow);
                var arr2 = updObj.slice(this.state.selectedRow + 1, updObj.length + 1);
                updObj = arr1.concat(arr2);
            }
        }

        this.setState({
            rows: updObj,
            saveWarning: true,
            selectedRow: -1,
        });
    },

    handleMoveUpRow() {
        if (this.state.selectedRow == -1) {
            Alert.alert("Tap the Select column to select a row first");
            return;
        }

        var updObj = this.state.rows;
        var row, selectedRow;

        if (this.state.selectedRow == 0) { // first row moves to the bottom
            row = updObj.shift();
            updObj = updObj.concat([row]);
            selectedRow = updObj.length - 1;
        } else {
            selectedRow = this.state.selectedRow - 1;
            row = updObj[this.state.selectedRow];
            updObj[this.state.selectedRow] = updObj[selectedRow];
            updObj[selectedRow] = row;
        }

        this.setState({
            rows: updObj,
            saveWarning: true,
            selectedRow: selectedRow,
        });
    },

    handleMoveDownRow() {
        if (this.state.selectedRow == -1) {
            Alert.alert("Tap the Select column to select a row first");
            return;
        }

        var updObj = this.state.rows;
        var row, selectedRow;
        if (this.state.selectedRow == updObj.length - 1) { // last row moves to the first row
            row = updObj.pop();
            updObj.splice(0, 0, row); // insert row to the top of array
            selectedRow = 0;
        } else {
            selectedRow = this.state.selectedRow + 1;
            row = updObj[this.state.selectedRow];
            updObj[this.state.selectedRow] = updObj[selectedRow];
            updObj[selectedRow] = row;
        }

        this.setState({
            rows: updObj,
            saveWarning: true,
            selectedRow: selectedRow,
        });
    },

    render() {
        var buttons = [{
            "buttonPosition": "L",
            "buttonText": "Menu Setup",
            "buttonIcon": IconNames.arrowBack,
            onPress: () => {
                /* back to category page */
                if (this.state.saveWarning) {
                    Alert.alert(
                        null,
                        'You have unsaved data, do you want continue?',
                        [
                            {text: 'Yes', onPress: () => this.props.navigator.pop()},
                            {text: 'No'},
                        ]
                    );
                } else {
                    /* back to category page without saving */
                    this.props.navigator.pop();
                }
            }},
            {
                "buttonPosition": "R",
                "buttonIcon": IconNames.home,
                onPress: () => {
                    /* home */

                    var routeStack = this.props.navigator.getCurrentRoutes();

                    for (var j = 0; j < routeStack.length; j++) {
                        if (routeStack[j].name == "Homepage") {
                            break;
                        }
                    }

                    var routeHome = routeStack[j];

                    if (this.state.saveWarning) {
                        Alert.alert(
                            null,
                            'You have unsaved data, do you want continue?',
                            [
                                {text: 'Yes', onPress: () => this.props.navigator.popToRoute(routeHome)},
                                {text: 'No'},
                            ]
                        );
                    } else {
                        /* back to home page without saving */
                        this.props.navigator.popToRoute(routeHome);
                    }
                }}];

        var rows = this.state.rows.map(function (data, index) {
            return <GridRow key={index}
                            rowIndex={index}
                            rowData={data}
                            subItem={data.subItem}
                            selectedRow={this.state.selectedRow}
                            onChangeText={this.handleUpdateRow.bind(this, index)}
                            onPress={this.handleRowAction.bind(this, index)}/>
        }, this);

        var actionBtns = <View style={styles.row}>
            <TSButtonSecondary label='Add Item' onPress={this.handleAddItem}/>
            <TSButtonSecondary label='Cancel' onPress={this.handleCancel}/>
            <TSButtonPrimary label='Save' onPress={this.handleSave}/>
        </View>;

        return (
            <View style={styles.container}>
                <TSHeader headerTitle={this.state.categoryName}
                          buttons={buttons}/>

                <KeyboardAwareScrollView>
                    <View style={styles.row}>
                        <View style={styles.flex1}>
                            <TSTextInput label='Category Name'
                                         onChangeText={this.handleCategoryNameChanged}
                                         value={this.state.categoryName}/>
                        </View>
                        {actionBtns}
                    </View>

                    {this.state.rows.length > 0 && <GridHeader onPress={this.showGroupHelp}/>}
                    {rows}
                </KeyboardAwareScrollView>

                {this.state.rows.length > 0 &&
                <View style={styles.row}>
                    <TSButtonSecondary buttonIconLeft="md-remove" label='Delete Selected'
                                       onPress={this.handleDeleteRow}/>
                    <TSButtonSecondary buttonIconLeft="md-arrow-up" label='Move Up'
                                       onPress={this.handleMoveUpRow}/>
                    <TSButtonSecondary buttonIconLeft="md-arrow-down" label='Move Down'
                                       onPress={this.handleMoveDownRow}/>
                    <View style={styles.alignLeft}>
                        {actionBtns}
                    </View>
                </View>
                }

            </View>
        );
    }
});

var styles = StyleSheet.create({
    container: {
        flex: 1,
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
    flex3: {
        flex: 3,
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
        margin: 4,
        marginTop: 0,
        marginBottom: 0,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: '#ECECEC',
    },
    highlight: {
        backgroundColor: '#FFFBC9',
    },
    alignLeft: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'flex-end',
    },
});

//module.exports = MenuDetail;
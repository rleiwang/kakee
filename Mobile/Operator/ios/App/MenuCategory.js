'use strict';

import React from 'react';

import {
    InteractionManager,
    StyleSheet,
    View,
    ScrollView,
    TouchableHighlight,
    Alert,
} from 'react-native';

import Postal from 'postal';
import clone from 'clone';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Button from 'shared-modules/Button';
import IconNames from 'shared-modules/IconNames';

import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import Menu from 'shared-modules/Menu';

import MenuDetail from './MenuDetail';

import Connector from "../../Common/Connector";
import Realm from '../../Common/Realm/RealmSingleton';
let pubMenuSub;

let TSPanel = React.createClass({

    render() {

        return (
            <TouchableHighlight onPress={this.props.onPress}>
                <View style={styles.panel}>
                    <View style={styles.column}>
                        <TSText>{this.props.rowData.name}</TSText>
                        {this.props.rowData.modified &&
                        <TSText fontSize='12' color='#FF0000' fontNormal={true}>(Not Publised Yet!)</TSText>}
                    </View>
                    {this.props.multiplePanels &&
                    <View style={[styles.row, styles.marginAround]}>
                        <Button onPress={this.props.onPressMoveUp}>
                            <View style={styles.row}>
                                <Ionicons
                                    name="md-arrow-up"
                                    size={20}
                                    color='#3B709F'/>
                                <TSText fontSize="12" color="#3B709F" fontNormal={true}>Display</TSText>
                            </View>
                        </Button>
                        <View style={styles.flex1}/>
                        <Button onPress={this.props.onPressMoveDown}>
                            <View style={styles.row}>
                                <TSText fontSize="12" color="#3B709F" fontNormal={true}>Display</TSText>
                                <Ionicons
                                    name="md-arrow-down"
                                    size={20}
                                    color='#3B709F'/>
                            </View>
                        </Button>
                    </View>}
                </View>
            </TouchableHighlight>
        )

    },
});

let TSNewCatPanel = React.createClass({

    render() {

        return (
            <TouchableHighlight onPress={this.props.onPress}>
                <View style={styles.panel}>
                    <View style={styles.column}>
                        <TSText color="#3B709F">Add Category</TSText>
                    </View>
                </View>
            </TouchableHighlight>
        )

    },
});

module.exports = React.createClass({

    getInitialState() {
        return {
            maxCategoryId: 0,
            /*categories: [{"categoryId": 1, "categoryName": "Main", "modified": true},
             {"categoryId": 2, "categoryName": "Beverage"}],*/
            categories: [],
            editingMenu: [],
        }
    },

    // this is called only during initial loading
    componentWillMount() {
        InteractionManager.runAfterInteractions(() => {
            this.loadMenuCategoriesFromDB(Realm.loadMenuCategory());
        });
    },

    componentDidMount() {
        pubMenuSub = Postal.channel("internal").subscribe("Menu",
            (menu) => {
                Alert.alert("Menu Published");
                Realm.resetMenuCategory();
                this.loadMenuCategoriesFromDB(Realm.loadMenuCategory());
                this.setState({newlyPublished: menu})
            });
    },

    componentWillUnmount() {
        pubMenuSub.unsubscribe();
    },

    // componentWillReceiveProps is called when transfer out and coming back
    // reload categories when coming back from menu details.
    componentWillReceiveProps: function (nextProps) {

        //var routeStack = nextProps.navigator.state.routeStack;
        var routeStack = nextProps.navigator.getCurrentRoutes();

        if (routeStack[routeStack.length - 1].name == "MenuCategory") {
            //RealmManager.loadCategory(this.loadMenuCategoriesFromDB);
            this.loadMenuCategoriesFromDB(Realm.loadMenuCategory());
        }
    },

    loadMenuCategoriesFromDB(data) {
        var rowsFromDB = [];
        var newRow;
        var maxCategoryId = 0;

        for (var i = 0, len = data.length; i < len; i++) {
            newRow = {};
            newRow.categoryId = data[i].categoryId;
            newRow.seqNo = data[i].seqNo;
            newRow.name = data[i].name;
            newRow.modified = data[i].modified;
            rowsFromDB.push(newRow);

            if (data[i].categoryId > maxCategoryId) {
                maxCategoryId = data[i].categoryId;
            }
        }

        this.setState({
            categories: rowsFromDB,
            maxCategoryId: maxCategoryId,
            editingMenu: clone(this.createPublishingMenu(rowsFromDB)),
        });
    },

    publishMenu() {
        // publish will save all local changes to cloud, and reset modified back to false.
        /* prodMenu.menuVersionId = '123'; */
        Connector.send({
            topic: "Menu",
            version: "new",
            // call createPublishingMenu again, in case user edited preview menu
            menu: JSON.stringify({menu: this.createPublishingMenu(this.state.categories)})
        });
    },

    createPublishingMenu(categories) {
        let output = [];
        if (categories) {
            categories.forEach(category => {
                Realm.loadMenuItems('isParent = true AND categoryId = $0', category.categoryId)
                    .forEach(menuItem => {
                        output.push({
                            category: category.name,
                            group: menuItem.group,
                            name: menuItem.name,
                            descr: menuItem.descr,
                            price: menuItem.price,
                            minOrder: menuItem.minOrder,
                            subItems: menuItem.subItems
                        });
                    });
            });
        }
        return output;
    },

    handleDrillInDetail(index) {
        this._drillInDetail(index);
    },

    _drillInDetail(index) {

        var category = this.state.categories[index];
        this.props.navigator.push({
            title: 'MenuDetail',
            name: 'MenuDetail',
            component: MenuDetail,
            passProps: {
                categoryId: category.categoryId, categoryName: category.name,
                categorySeqNo: category.seqNo
            },
        });
    },

    handleMoveUp(index) {
        var updObj = this.state.categories;
        var row, selectedRow;

        if (index == 0) { // first row moves to the bottom
            row = updObj.shift();
            updObj = updObj.concat([row]);
        } else {
            selectedRow = index - 1;
            row = updObj[index];
            updObj[index] = updObj[selectedRow];
            updObj[selectedRow] = row;
        }

        this.handleSaveSorting(updObj);
    },

    handleMoveDown(index) {
        var updObj = this.state.categories;
        var row, selectedRow;
        if (index == updObj.length - 1) { // last row moves to the first row
            row = updObj.pop();
            updObj.splice(0, 0, row); // insert row to the top of array
        } else {
            selectedRow = index + 1;
            row = updObj[index];
            updObj[index] = updObj[selectedRow];
            updObj[selectedRow] = row;
        }

        this.handleSaveSorting(updObj);
    },

    handleDbSaved(status) {

    },

    handleSaveSorting(rows) {

        for (let i = 0; i < rows.length; i++) {
            rows[i].seqNo = i;
        }

        Realm.saveMenuCategory(rows);

        this.setState({categories: rows,
            editingMenu: this.createPublishingMenu(rows)});
    },

    handleAddNew() {
        var seqNo = this.state.categories.length;
        var categoryId = this.state.maxCategoryId + 1;

        this.setState(({maxCategoryId: categoryId}));

        this.props.navigator.push({
            title: 'MenuDetail',
            name: 'MenuDetail',
            component: MenuDetail,
            passProps: {categoryId: categoryId, categorySeqNo: seqNo},
        });
    },

    render() {

        var buttons = [{
            "buttonPosition": "L",
            "buttonText": "Back",
            "buttonIcon": IconNames.arrowBack,
            onPress: () => { // go back home
                this.props.navigator.pop();
            }
        },
            {
                "buttonPosition": "R",
                "buttonIcon": IconNames.home,
                onPress: () => {
                    this.props.navigator.pop();
                }
            }];

        let MultiplePanels = this.state.categories.length > 1 ? true : false;

        var panels = this.state.categories.map(function (data, index) {

            return <TSPanel key={index}
                            rowIndex={index}
                            rowData={data}
                            multiplePanels={MultiplePanels}
                            onPress={this.handleDrillInDetail.bind(this, index)}
                            onPressMoveUp={this.handleMoveUp.bind(this, index)}
                            onPressMoveDown={this.handleMoveDown.bind(this, index)}
                            _panResponder={this._panResponder}
            />
        }, this);

        const publishedMenu = this.state.newlyPublished ? this.state.newlyPublished.menus : this.props.publishedMenus;

        return (
            <View style={styles.container}>
                <TSHeader headerTitle='Menu Setup'
                          buttons={buttons}/>
                <View style={styles.flex1}>
                    <View style={styles.section}>
                        <View style={styles.sectionLeft}>
                            <View style={styles.flex1}>
                                {/*<View style={styles.marginBottom10}>
                                    <TSButtonPrimary label="Add Category/Items"
                                                     onPress={this.handleAddNew}/>
                                </View>*/}
                                {/*MultiplePanels &&
                                    <View style={styles.marginBottom10}>
                                        <TSButtonPrimary label="Save Display Sequence" onPress={this.handleSaveSorting}/>
                                    </View>*/}
                                <ScrollView style={styles.flex1}>
                                    <View style={[styles.row, styles.rowWrap]}>
                                        {panels}
                                         <TSNewCatPanel onPress={this.handleAddNew}/>
                                    </View>
                                </ScrollView>
                                <TSText fontNormal={true}>Tap Category tile to set up items.</TSText>
                            </View>
                        </View>
                        <View style={styles.sectionRight}>
                            {this.state.editingMenu.length > 0 ?
                                <View style={styles.flex1}>
                                    <View style={styles.menuAlign}>
                                        <TSButtonPrimary buttonIconLeft={IconNames.cloudUpload}
                                                         label="Publish Menu to Customer"
                                                         onPress={this.publishMenu}/>
                                    </View>
                                    <TSText>Menu Setup Preview</TSText>
                                    <ScrollView><Menu menus={this.state.editingMenu}/></ScrollView>
                                </View> : <TSText>No Setup Menu to Preview!</TSText>}
                        </View>
                        <View style={styles.sectionRight}>
                            {publishedMenu.length > 0 ?
                                <View style={styles.flex1}>
                                    <View style={styles.menuAlign}></View>
                                    <TSText>Published Menu</TSText>
                                    <ScrollView><Menu menus={publishedMenu}/></ScrollView>
                                </View> : <TSText>No Publised Menu!</TSText>}
                        </View>
                    </View>
                </View>
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowWrap: {
        flexWrap: 'wrap',
    },
    column: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    section: {
        flex: 1,
        flexDirection: 'row',
        marginTop: 10,
    },
    sectionRight: {
        flex: 1,
        flexDirection: 'column',
        marginBottom: 10,
        marginRight: 10,
        borderLeftWidth: 1,
        borderLeftColor: '#A9B1B9',
    },
    sectionLeft: {
        width: 200,
        flexDirection: 'column',
        marginBottom: 10,
    },
    panel: {
        margin: 2,
        width: 180,
        height: 150,
        backgroundColor: '#ECECEC',
    },
    marginBottom10: {
        marginBottom: 10,
    },
    menuAlign: {
        height: 50,
    },
    flex1: {
        flex: 1,
    },
    flex2: {
        flex: 2,
    },
    marginAround: {
        margin: 10,
    },
})

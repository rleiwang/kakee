'use strict';

import React from 'react';

import {
    StyleSheet,
    View,
    ScrollView,
    Text,
    Alert,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';

import TSText from 'shared-modules/TSText';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';
import TSTextInput from 'shared-modules/TSTextInput';

import Realm from '../../Common/Realm/RealmSingleton';

var GridHeader = React.createClass({
    render() {
        return (
            <View style={styles.headerRow}>
                <View style={styles.flex1}><Text style={styles.columnLabel}>Select</Text></View>
                {/*<View style={styles.flex2}><Text style={styles.columnLabel}>Current</Text></View>*/}
                <View style={styles.flex4}><Text style={styles.columnLabel}>City</Text></View>
                <View style={styles.flex2}><Text style={styles.columnLabel}>Tax %</Text></View>
            </View>
        );
    }
});

var GridRow = React.createClass({

    handleSelectRow() {
        this.props.onPress("SelectRow");
    },

    handleCurrent() {
        this.props.onPress("SelectCurrent");
    },

    render() {

        var rowStyle;
        if (this.props.rowIndex == this.props.selectedRow) {
            rowStyle = [styles.dataRow, styles.highlight];
        } else {
            rowStyle = styles.dataRow;
        }

        return (
            <View style={rowStyle}>
                <View style={styles.flex1}>
                    <TSButtonSecondary onPress={this.handleSelectRow}/>
                </View>
                <View style={styles.flex4}>
                    <TSTextInput value={this.props.rowData["city"]}
                                 onChangeText={(text)=>{this.props.onChangeText("city", text)}}
                    />
                </View>
                <View style={styles.flex2}>
                    <TSTextInput value={this.props.rowData["tax"]}
                                 keyboardType='decimal-pad'
                                 onChangeText={(text)=>{this.props.onChangeText("tax", text)}}
                    />
                </View>
            </View>
        );
    }
});

module.exports = React.createClass({

    getInitialState() {
        return {
            versionId: 0,
            selectedRow: -1,
            currentCity: "",
            /*rows: {"San Francisco": "9.25", "Forster City": "8.75"},*/
            rows: [],
            saveWarning: false,
        };
    },

    componentWillMount() {
        this.loadCityTaxesFromDB(Realm.loadCityTax());
    },

    loadCityTaxesFromDB(data) {
        var rowsFromDB = [];
        var newRow;

        if (data && data.length > 0) {
            var content = JSON.parse(data[0].cityTax);
            for (var key in content) {
                newRow = {};
                newRow.city = key;
                newRow.tax = content[key];
                rowsFromDB.push(newRow);
            }

            this.setState({rows: rowsFromDB, versionId: data[0].versionId});
        }

        // check if the business is open with a city tax already selected
        //this.loadBusinessHour(Realm.loadBusinessHour());
    },

    loadBusinessHour(data) {
        if (data && data.length > 0) {
            if (data.status == "O") {  // if it's open, get the current operation city
                var rows = this.state.rows;
                var currentCity = data.taxCityKey;
                for (var i = 0; i < rows.length; i++) {
                    if (rows[i].city == currentCity) {
                        break;
                    }
                }
                this.setState({currentCity: currentCity});
            }
        }
    },

    handleAddCity() {
        /* add a new city after selected row, otherwise, add to the bottom */
        var updObj = this.state.rows;

        var row = {};

        if (this.state.selectedRow == -1 || this.state.selectedRow == this.state.rows.length - 1) {
            updObj.push(row);
        } else {
            updObj.splice(this.state.selectedRow + 1, 0, row);
        }

        this.setState({
            rows: updObj,
            saveWarning: true,
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

        /*
         // change current city the food truck is in
         if (action == "SelectCurrent") {
         // select the row as default and clear out others
         this.setState({currentCity: rowIndex, saveWarning: true});

         // trigger content changed
         this.props.onChange(true);

         return;
         }*/

    },

    /* update row input text cells */
    handleUpdateRow(rowIndex, id, value) {

        var updObj = this.state.rows;
        var row = updObj[rowIndex];
        /* id stores the properties of row, such as city, tax, etc. Associate array */
        row[id] = value;

        // trigger content changed
        this.props.onChange(true);

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

        // reset default to the first row if the default city is deleted.
        var defaultCity = this.state.defaultCity;
        if (defaultCity == this.state.selectedRow) {
            defaultCity = 0;
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

        // trigger content changed - this back to the parent component
        this.props.onChange(true);

        this.setState({
            rows: updObj,
            selectedRow: -1,
            saveWarning: true,
        });
    },

    handleSave() {

        if (!this.state.saveWarning) {
            return;
        }

        var rows = this.state.rows;
        var len = rows.length;

        //validations
        for (var i = 0; i < len; i++) {
            if (!(rows[i].city) && (rows[i].tax)) {
                Alert.alert("Error", "City Tax cannot be empty.  Make sure they are entered before Save.");
                return;
            }

            if (isNaN(rows[i].tax)) {
                Alert.alert("Error", "City Tax is a invalid number.");
                return;
            }
        }

        /*if (this.state.currentCity) {
            Alert.alert(
                null,
                "Changing City Tax during business hours may affect tax transaction, do you want to continue?",
                [
                    {
                        text: 'Yes', onPress: this._save
                    },
                    {
                        text: 'No', onPress: () => {
                    }
                    },
                ]
            );
        } else {
            this._save();
        }*/
        this._save();
    },

    _handleDbSaved(status) {
        this.setState({
            saveWarning: false,
        });
    },

    _save() {
        var rows = this.state.rows;
        var len = rows.length;

        // trigger management menu badge change
        this.props.onChange(false, this.state.rows.length);

        let selectedCity = Realm.getPreferences("city");
        var output = {};
        var cityTax = {}; // associated array
        let deleted = true;
        for (var i = 0; i < len; i++) {
            cityTax[rows[i].city] = rows[i].tax;
            if (selectedCity === rows[i].city) {
                deleted = false;
            }
        }

        output.versionId = this.state.versionId + 1;
        // new Date() returns date, where Date.now() returns number of milliseconds since 1/1/1970
        output.timestamp = Date.now();
        var date = new Date();
        //output.localdttm = date.toLocaleString();
        output.localdttm = date.toString();
        output.cityTax = JSON.stringify(cityTax);

        /*
         for (var i = 0, len = rows.length; i < len; i++) {
         var obj;
         output.push({});
         obj = output[i];
         obj.taxId = rows[i].taxId;
         obj.city = rows[i].city;
         obj.tax = rows[i].tax;
         if (this.state.defaultCity == i) {
         obj.defaultFlag = true;
         } else {
         obj.defaultFlag = false;
         }
         }*/

        Realm.saveCityTax(output);
        if (deleted) {
            Realm.deletePreferences("city");
        }

        this._handleDbSaved();

        this.setState({
            rows: rows,
            versionId: output.versionId,
        });
        Alert.alert("Saved");
    },

    render() {

        var rows = this.state.rows.map(function (data, index) {
            return <GridRow key={index}
                            rowIndex={index}
                            rowData={data}
                            selectedRow={this.state.selectedRow}
                            currentCity={this.state.currentCity}
                            onChangeText={this.handleUpdateRow.bind(this, index)}
                            onPress={this.handleRowAction.bind(this, index)}/>
        }, this);

        var actionBtns = <View style={styles.row}>
            <TSButtonSecondary label='Add City' onPress={this.handleAddCity}/>
            <TSButtonPrimary label='Save' onPress={this.handleSave}/>
        </View>;

        return (
            <View style={styles.container}>
                <TSText>Specify City Tax For Each City You Cover</TSText>
                <ScrollView>
                    <View style={styles.row}>
                        <View style={styles.flex1}>
                        </View>
                        {actionBtns}
                    </View>

                    {this.state.rows.length > 0 && <GridHeader/>}
                    {rows}
                </ScrollView>

                {this.state.rows.length > 0 &&
                <View style={styles.row}>
                    <TSButtonSecondary label='Delete Selected' onPress={this.handleDeleteRow}/>
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
    icon: {
        alignSelf: 'center',
        width: 25,
        height: 25,
    },
});

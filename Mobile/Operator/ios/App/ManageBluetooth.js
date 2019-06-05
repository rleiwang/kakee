'use strict';

import React from 'react';

import {
    StyleSheet,
    View,
    ScrollView,
    Text,
    Linking,
    NativeModules,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';

import Button from 'shared-modules/Button';
import TSText from 'shared-modules/TSText';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';

const Printer = NativeModules.Printers;

var GridHeader = React.createClass({
    render() {
        return (
            <View style={styles.headerRow}>
                <View style={styles.flex4}><Text style={styles.columnLabel}>Printers</Text></View>
            </View>
        );
    }
});

var GridRow = React.createClass({

    render() {
        return (
            <View style={styles.dataRow}>
                <View style={styles.flex1}>
                    <TSText fontNormal={true}>{this.props.rowData}</TSText>
                </View>
            </View>
        );
    }
});

export default React.createClass({

    async _searchBluetooth() {
        this.setState({
            printers: await Printer.searchPrinters()
        });
    },

    getInitialState() {
        return {
            printers: []
        };
    },

    componentWillMount() {
        this._searchBluetooth();
    },

    render() {
        var rows = this.state.printers.map(function (data, index) {
            return <GridRow key={index}
                            rowIndex={index}
                            rowData={data}
                            onPress={() => {}}/>
        }, this);

        var actionBtns = <View style={styles.row}>
            <TSButtonPrimary label='Search Bluetooth Printer' onPress={this._searchBluetooth}/>
        </View>;

        return (
            <View style={styles.container}>
                <View style={styles.row}>
                    <TSText>Attached Printers</TSText>
                    <View style={styles.flex1}/>
                    {actionBtns}
                </View>
                {this.state.printers.length == 0 &&
                <TSText fontNormal={true}>No attached printers</TSText>}
                <ScrollView>
                    {this.state.printers.length > 0 && <GridHeader/>}
                    {rows}
                </ScrollView>
                <View style={styles.row}>
                    <TSText>Supported Printers</TSText>
                </View>
                <View style={styles.row}>
                    <Button
                        onPress={() => Linking.openURL('http://www.starmicronics.com/printer/impact_printers/sp700')}>
                        <TSText fontNormal={true} color="#5194B9">Star Micronics SP700, Part No:39339810</TSText>
                    </Button>
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

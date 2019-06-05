'use strict';

import React from 'react';

import {
    TouchableHighlight,
    StyleSheet,
    View,
    Text,
    StatusBar,
    Platform,
    Alert,
} from 'react-native';

import Postal from 'postal';

import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import TSTextInput from './TSTextInput';
import IconNames from './IconNames';

import Button from './Button';
import Env from './Env';

const RED_COLOR = "#F96121";
const GREEN_COLOR = "#23CF5F";

const TSButton = React.createClass({
    render() {

        let iconSource = "Ionicons"; // default source
        if (this.props.buttonData.iconSource) {
            iconSource = this.props.buttonData.iconSource;
        }

        return (
            <Button onPress={this.props.onPress}>
                <View style={styles.row}>
                    {this.props.buttonData.buttonIcon && iconSource == 'Ionicons' && <Ionicons
                        name={this.props.buttonData.buttonIcon}
                        size={30}
                        color={this.props.buttonData.iconColor ? this.props.buttonData.iconColor : '#ffffff'}
                    />}
                    {this.props.buttonData.buttonIcon && iconSource == 'FontAwesome' && <FontAwesome
                        name={this.props.buttonData.buttonIcon}
                        size={30}
                        color={this.props.buttonData.iconColor ? this.props.buttonData.iconColor : '#ffffff'}
                    />}
                    {this.props.buttonData.buttonText ?
                        <Text style={styles.toolbarButtonText}>{this.props.buttonData.buttonText}</Text> : null}
                </View>
            </Button>
        )
    }
});

const TSAlertButton = React.createClass({
    render() {

        return (
            <Button onPress={this.props.onPress}>
                <View style={styles.alertButton}>
                    <Ionicons
                        name={this.props.buttonIcon}
                        size={20}
                        color={this.props.buttonColor}
                    />
                    <Text style={styles.buttonText}>{this.props.buttonText}</Text>
                </View>
            </Button>
        )
    }
});

module.exports = React.createClass({
    getInitialState() {
        return {
            searchText: null,
            isConnected: Env.isConnected,
            isPrinterOn: Env.isPrinterConnected,
        }
    },

    handleChangeText(text) {
        this.setState({searchText: text});
    },

    handleSearch() {
        this.props.onSearch(this.state.searchText);
    },

    showMsgNoConnection() {
        this._reconnect();
        Alert.alert("Reconnecting ...", "Make sure you have network connection. If problem still persist when network is on, please contact kakee@tristonetech.com");
    },

    showMsgNoPrinter() {
        Alert.alert("No Printer", "Use Bluetooth settings to set up bluetooth printer in order to print receipts.");
    },

    componentDidMount() {
        this._subs = [Postal.channel("internal").subscribe("Connector", this._onConnectorChangeEvent),
            Postal.channel("internal").subscribe("PrinterConnection", this._onPrinterChangeEvent) ];
    },

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    },

    render() {
        //alert(JSON.stringify(this.props));
        var leftButtons = this.props.buttons.map(function (data, index) {
            if (data.buttonPosition == 'L') {
                return <TSButton key={index} buttonData={data}
                                 onPress={data.onPress}/>
            }
        }, this);

        var rightButtons = this.props.buttons.map(function (data, index) {
            if (data.buttonPosition == 'R') {
                return <TSButton key={index} buttonData={data}
                                 onPress={data.onPress}/>
            }
        }, this);

        leftButtons = <View style={styles.alignCenter}>{leftButtons}</View>;
        rightButtons = <View style={styles.alignCenter}>{rightButtons}</View>;

        const hidePrinter = this.props.hideConnection ? true : this.props.hidePrinter;
        return (
            <View style={[styles.toolbar, Platform.OS === "ios" && styles.paddingTop]} onLayout={this.props.onLayout}>
                <StatusBar barStyle="light-content"/>
                {leftButtons}
                {this.props.hideConnection ? null : (this.state.isConnected ?
                    <TSAlertButton buttonIcon="md-cloud-done" buttonColor={GREEN_COLOR} buttonText="Connected"/>
                    : <TSAlertButton buttonIcon="md-alert" buttonColor={RED_COLOR} buttonText="No Connection" onPress={this.showMsgNoConnection}/>)}
                {hidePrinter ? null : (this.state.isPrinterOn ?
                    <TSAlertButton buttonIcon={IconNames.print} buttonColor={GREEN_COLOR} buttonText="Printer On"/>
                    : <TSAlertButton buttonIcon="md-alert" buttonColor={RED_COLOR} buttonText="No Printer" onPress={this.showMsgNoPrinter}/>)}
                <Text style={styles.toolbarTitle}>{this.props.headerTitle}</Text>
                {rightButtons}
            </View>
        );
    },

    _onConnectorChangeEvent(e) {
        this.setState({isConnected: 'Open' === e.type})
    },

    _onPrinterChangeEvent(e) {
        this.setState({isPrinterOn: 'Connected' === e.type})
    },

    _reconnect() {
        Postal.publish({channel: "internal", topic: 'Reconnect'});
    }
});

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        margin: 5,
        marginRight: 10,
        alignItems: 'center',
    },
    alertButton: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 5,
    },
    toolbar: {
        //paddingBottom: 5,
        backgroundColor: '#3B709F',
        flexDirection: 'row',
        alignItems: 'center',
    },
    paddingTop: {
        paddingTop: 30,
    },
    toolbarButton: {
        padding: 5,
        margin: 5,
    },
    toolbarButtonText: {
        marginLeft: 4,
        fontSize: 18,
        //color: '#ECECEC',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    buttonText: {
        marginLeft: 4,
        fontSize: 12,
        //color: '#ECECEC',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    toolbarTitle: {
        //color: '#ECECEC',
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
        alignItems: 'center',
    },
    alignCenter: {
        flexDirection: 'row',
        marginLeft: 5,
        marginRight: 5,
        alignItems: 'center',
    },
    icon: {
        marginRight: 5,
        width: 25,
        height: 25,
    },
    clearMarginRight: {
        marginRight: 0,
    },
    searchField: {
        width: 80,
    }
});

'use strict';

import React, {
    Component,
    PropTypes,
} from 'react';

import {
    Alert,
    NativeModules,
    StyleSheet,
    View,
    WebView
} from 'react-native';

import Postal from 'postal';

import TSHeader from 'shared-modules/TSHeader';
import Env from 'shared-modules/Env';
import IconNames from 'shared-modules/IconNames';
import BusyIndicatorLoader from 'shared-modules/BusyIndicatorLoader';

import Connector from '../../Common/Connector';
import Realm from '../../Common/Realm/RealmSingleton';
import OperatorEnv from './OperatorEnv';

const PaymentProcessor = NativeModules.PaymentProcessor;

export default class extends Component {
    constructor(props) {
        super(props);
        this._subs = [Postal.channel("external").subscribe("PaypalLoginURL", this._onPaypalLoginURL.bind(this)),
            Postal.channel("external").subscribe("PayPalLoginError", this._onPayPalLoginError.bind(this)),
            Postal.channel("external").subscribe("PaypalToken", this._onPaypalToken.bind(this))];
        this.state = {showPage: false};
    }

    componentWillMount() {
        const sent = Connector.send({topic: 'PaypalLoginURL'});
        if (sent) {
            BusyIndicatorLoader.show();
        } else {
            Alert.alert("no network connection");
            this.props.navigator.pop();
        }
    }

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    }

    render() {
        var hdrButtons = [{
            "buttonPosition": "R",
            "buttonIcon": IconNames.home,
            onPress: () => {
                /* back to home page without saving */
                this.props.navigator.pop();
            }
        }];

        return (
            <View style={styles.container}>
                <TSHeader headerTitle='PayPal Login' buttons={hdrButtons}/>
                {this.state.showPage === true &&
                <WebView automaticallyAdjustContentInsets={true}
                         style={styles.content}
                         source={{uri: this.state.paypal.loginURL}}
                         onShouldStartLoadWithRequest={this._onShouldStartLoadWithRequest.bind(this)}
                         startInLoadingState={false}
                         scalesPageToFit={true}/>}
            </View>
        );
    }

    _onPaypalLoginURL(paypal) {
        this.setState({paypal: paypal, showPage: true}, () => BusyIndicatorLoader.hide());
    }

    _onPayPalLoginError() {
        BusyIndicatorLoader.hide();
        this.setState({showPage: true});
        Alert.alert("Login Failed!");
    }

    _onPaypalToken(token) {
        PaymentProcessor.initProcessor({
            access_token: token.access_token,
            refresh_url: `${Env.webServiceAddr}/${token.refresh_url}`,
            expires_in: token.expires_in,
            isProd: Env.isProd,
            operatorId: Realm.operatorId
        }).then(status => {
                BusyIndicatorLoader.hide();
                if (status[0] === true) {
                    OperatorEnv.isPayPalEnabled = true;
                    this.props.navigator.pop();
                } else {
                    Alert.alert("paypal authentication error");
                }
            })
            .catch(e => {
                BusyIndicatorLoader.hide();
                Alert.alert("error to initialize", e)
            });
    }

    _onShouldStartLoadWithRequest(event) {
        if (event.url.startsWith(this.state.paypal.validateURL)) {
            this.setState({showPage: false});
            const sent = Connector.send({
                topic: 'PaypalValidation',
                validationURL: event.url
            });
            if (sent) {
                BusyIndicatorLoader.show();
            } else {
                Alert.alert("PayPal login failed", "no network connection");
                this.props.navigator.pop();
            }
        }
        return true;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    content: {
        flex: 1,
        flexDirection: 'row'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    vCenter: {
        justifyContent: 'center'
    },
    leftPanel: {
        flex: 25,
        margin: 4,
        borderRightWidth: 1,
        borderRightColor: '#A9B1B9'
    },
    rightPanel: {
        flex: 75,
        margin: 4
    },
    rowSeparatorBottom: {
        borderBottomWidth: 1,
        borderBottomColor: "#A9B1B9"
    },
    btn: {
        height: 50,
        padding: 4,
        margin: 4
    },
    selectedBtn: {
        backgroundColor: '#A9B1B9'
    },
    flex1: {
        flex: 1
    }
});

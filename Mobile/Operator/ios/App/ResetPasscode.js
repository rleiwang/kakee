'use strict';

import React from 'react';

import {
    Alert,
    AsyncStorage,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

import Postal from 'postal';
import Sha256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';

import TSHeader from 'shared-modules/TSHeader';
import DeviceInfo from 'shared-modules/DeviceInfo';
import TSText from 'shared-modules/TSText';
import TSTextInput from 'shared-modules/TSTextInput';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';
import IconNames from 'shared-modules/IconNames';

import Connector from '../../Common/Connector';
import Realm from '../../Common/Realm/RealmSingleton';

module.exports = React.createClass({
    getInitialState() {
        this._subs = [Postal.channel("external").subscribe("CodeVerification", this._onVerified),
            Postal.channel("external").subscribe("SignUpEmail", this._onSignUpEmail),
            Postal.channel("external").subscribe("ResetPasscode", this._onResetPasscode),
            Postal.channel("external").subscribe("Authorization", this._onAuthorization),
            Postal.channel("external").subscribe("VerificationCodeExpiry", this._onCodeSent)];
        Connector.send({
            topic: 'SignUpEmail',
            operatorId: this.props.operatorId
        });
        return {
            passcodeA: "",
            passcodeB: "",
            signUpEmail: "Email"
        };
    },

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    },

    render() {
        const buttons = [{
            "buttonPosition": "L",
            "buttonText": "Back",
            "buttonIcon": IconNames.arrowBack,
            onPress: () => this.props.navigator.popToTop()
        }];

        const hint = this.state.expiry ? "Expire " + new Date(this.state.expiry)
            .toLocaleString(DeviceInfo.info().locale) : " ";

        return (
            <View style={styles.container}>
                <TSHeader headerTitle={`${this.props.truckId} Password Reset`}
                          buttons={buttons}/>
                <View style={styles.content}>
                    <TSTextInput label='Passcode'
                                 placeholder='six digits only'
                                 secureTextEntry={true}
                                 keyboardType="numeric"
                                 onChangeText={text => this.setState({passcodeA: text})}>
                    </TSTextInput>
                    <TSTextInput label='Re-enter Passcode'
                                 placeholder='six digits only'
                                 secureTextEntry={true}
                                 keyboardType="numeric"
                                 onChangeText={text => this.setState({passcodeB: text})}>
                    </TSTextInput>
                    <View style={styles.row}>
                        <View style={styles.flex3}>
                            <TSText number={true}>Verification Code</TSText>
                        </View>
                        <View style={styles.flex7}>
                            <View style={styles.row}>
                                <View style={styles.flex1}>
                                    <TSTextInput secureTextEntry={false}
                                                 keyboardType="numeric"
                                                 placeholder={hint}
                                                 onPress={this._showModal}
                                                 onChangeText={(text) => {this.setState({verficationCode: text})}}>
                                    </TSTextInput>
                                </View>
                            </View>
                            <TSButtonSecondary label={`Send Verification Code To ${this.state.signUpEmail}`}
                                               onPress={this._onSendCode}/>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.flex3}/>
                        <View style={styles.flex7}>
                            <View style={styles.row}>
                                <TSButtonPrimary label="Reset" onPress={this._onReset}/>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    },

    _onSignUpEmail(signUpEmail) {
        if (signUpEmail.email) {
            this.setState({signUpEmail: signUpEmail.email});
        } else {
            Alert.alert(`Error`, `Can't reset password from unrecognized device.`,
                [{
                    text: 'OK',
                    onPress: () => this.props.navigator.pop()
                }]);
        }
    },

    _onSendCode() {
        Connector.send({
            topic: 'SendResetCode',
            operatorId: this.props.operatorId
        });
    },

    _onCodeSent(ack) {
        this.setState({expiry: ack.expiry});
    },

    _onReset() {
        if (this.state.passcodeA !== this.state.passcodeB) {
            Alert.alert("Invalid Passcode", "Passcode doesn't match.");
            return;
        }

        if (isNaN(this.state.passcodeA) || this.state.passcodeA.length != 6) {
            Alert.alert("Invalid Passcode", "Passcode must be 6 digits.");
            return;
        }

        if (!this.state.verficationCode) {
            Alert.alert("Verification Code", "Verification code is required.");
            return;
        }

        Connector.send({
            topic: 'ResetPasscode',
            operatorId: this.props.operatorId,
            verificationCode: this.state.verficationCode,
            passCode: Sha256(this.state.passcodeA).toString(Hex)
        });
    },

    _onResetPasscode(reset) {
        switch (reset.status) {
            case 0:
                Alert.alert("Done", "Reset Passcode");
                break;
            case 3:
                Alert.alert("Invalid Verification Code", "If verification code is expired, regenerate a new one to reset.");
                break;
        }
    },

    _onAuthorization(auth) {
        const routeStack = this.props.navigator.getCurrentRoutes();
        if (routeStack[routeStack.length - 1].name === "ResetPasscode") {
            if (auth.token) {
                AsyncStorage.setItem(Realm.LastLoginKey, JSON.stringify({truckId: this.props.truckId}));
                Realm.switchToOperator(Sha256(this.props.truckId).toString(Hex));
                this.props.navigator.push({
                    title: 'Homepage',
                    name: 'Homepage',
                    component: require('./Homepage'),
                    passProps: {}
                });
            }
        }
    }
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    content: {
        margin: 10,
        marginTop: 20,
    },
    flex3: {
        flex: 3,
    },
    flex7: {
        flex: 7,
    },
    flex1: {
        flex: 1,
    },
});
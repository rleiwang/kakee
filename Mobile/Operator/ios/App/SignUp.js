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
import TSModal from 'shared-modules/TSModal';
import TSModalHeader from 'shared-modules/TSModalHeader';
import IconNames from 'shared-modules/IconNames';
import BusyIndicatorLoader from 'shared-modules/BusyIndicatorLoader';

import Connector from '../../Common/Connector';
import Realm from '../../Common/Realm/RealmSingleton';

module.exports = React.createClass({
    getInitialState() {
        this._subs = [Postal.channel("external").subscribe("CodeVerification", this._onVerified),
            Postal.channel("external").subscribe("Authorization", this._onAuthorization),
            Postal.channel("external").subscribe("VerificationCodeExpiry", this._onCodeSent)];
        return {
            truckId: "",
            passcodeA: "",
            passcodeB: "",
            email: "",
            promotionCode: "",
            showModal: false,
            btnTxt: 'Generate Verification Code'
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
        const modalBtns = [{
            "buttonPosition": "R", "buttonText": "Cancel",
            onPress: () => this.setState({showModal: false})
        }];

        const hint = this.state.expiry ? "Enter Before " + new Date(this.state.expiry)
            .toLocaleTimeString(DeviceInfo.info().locale) : " ";

        return (
            <View style={styles.container}>
                <TSHeader headerTitle="Sign Up"
                          hidePrinter={true}
                          buttons={buttons}/>
                <View style={styles.content}>
                    <TSTextInput label='Truck ID'
                                 secureTextEntry={false}
                                 onChangeText={text => this.setState({truckId: text})}>
                    </TSTextInput>
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
                    <TSTextInput label='Promotion Code'
                                 hint="(Optional) "
                                 secureTextEntry={false}
                                 onChangeText={text => this.setState({promotionCode: text})}>
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
                                <TSButtonSecondary label={this.state.btnTxt} onPress={this._showModal}/>
                            </View>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.flex3}/>
                        <View style={styles.flex7}>
                            <View style={styles.row}>
                                <TSButtonPrimary label="Sign Up for Free Trial" onPress={this._onSignUp}/>
                            </View>
                        </View>
                    </View>
                    <TSModal visible={this.state.showModal} position="top" width={500}>
                        <TSModalHeader headerTitle={this.state.btnTxt}
                                       buttons={modalBtns}
                                       onPress={this._handleModalBtnOnPress}/>
                        <View style={styles.content}>
                            <TSTextInput label="Email"
                                         keyboardType="email-address"
                                         value={this.state.email}
                                         onChangeText={this._setEmail}>
                            </TSTextInput>
                            <View style={styles.row}>
                                <View style={styles.flex3}/>
                                <View style={styles.flex7}>
                                    <View style={styles.row}>
                                        <TSButtonSecondary label={"Send"} onPress={this._onSendCode}/>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </TSModal>
                </View>
            </View>
        );
    },

    _onSendCode() {
        this.setState({showModal: false}, () => {
            const sent = Connector.send({
                topic: 'SendVerificationCode',
                email: this.state.email
            });
            if (sent) {
                BusyIndicatorLoader.show();
            } else {
                Alert.alert("no network connection");
            }
        });
    },

    _onCodeSent(ack) {
        this.setState({
            expiry: ack.expiry,
            btnTxt: 'Regenerate Verification Code'
        }, () => BusyIndicatorLoader.hide());
    },

    _onSignUp() {
        if (!this.state.truckId || this.state.truckId.length == 0) {
            Alert.alert("Truck ID Missing", "Truck ID is required.");
            return;
        }

        if (this.state.passcodeA !== this.state.passcodeB) {
            Alert.alert("Invalid Passcode", "Passcode doesn't match.");
            return;
        }

        if (isNaN(this.state.passcodeA) || this.state.passcodeA.length != 6) {
            Alert.alert("Invalid Passcode", "Passcode must be 6 digits.");
            return;
        }

        if (this.state.email.length === 0) {
            Alert.alert("Verification Code", "Please generate verification code.");
            return;
        }

        if (!this.state.verficationCode) {
            Alert.alert("Verification Code", "Verification code is required.");
            return;
        }

        const sent = Connector.send({
            topic: 'SignUp',
            email: this.state.email,
            operatorId: Sha256(this.state.truckId).toString(Hex),
            name: this.state.truckId,
            verificationCode: this.state.verficationCode,
            password: Sha256(this.state.passcodeA).toString(Hex),
            promotionCode: this.state.promotionCode
        });
        if (sent) {
            this.setState({showModal: false}, () => BusyIndicatorLoader.show());
        } else {
            Alert.alert("no network connection");
        }
    },

    _onVerified(verification) {
        let title;
        let msg;
        if (verification.verified === false) {
            title = "Invalid Verification Code";
            msg = "If verification code is expired, regenerate a new one to sign up.";
        } else if (verification.promoted === false) {
            title = "Invalid Promotion Code"
            msg = "Please check spelling and case";
        } else if (verification.truckIdExists) {
            title = "Truck ID In Use";
            msg = `You entered truck ID ${this.state.truckId} already exists, please enter a new one.`;
        } else {
            title = "Signed Up Successfully!";
            msg = "Thank you for choosing Kakee. Please continue to setup Profile and Menu before open for business.";
        }

        Alert.alert(title, msg, [{text: 'OK', onPress: () => BusyIndicatorLoader.hide()}]);
    },

    _handleModalBtnOnPress() {
        this.setState({showModal: false});
    },

    _showModal() {
        this.setState({showModal: true});
    },

    _setEmail(text) {
        this.setState({email: text});
    },

    _onAuthorization(auth) {
        const routeStack = this.props.navigator.getCurrentRoutes();
        if (routeStack[routeStack.length - 1].name === "SignUp") {
            if (auth.token) {
                AsyncStorage.setItem(Realm.LastLoginKey, JSON.stringify({truckId: this.state.truckId}));
                Realm.switchToOperator(Sha256(this.state.truckId).toString(Hex));
                this.props.navigator.push({
                    title: 'Homepage',
                    name: 'Homepage',
                    component: require('./Homepage'),
                    passProps: {truckId: this.state.truckId}
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
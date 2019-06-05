'use strict';

import React from 'react';

import {
    Alert,
    AsyncStorage,
    StyleSheet,
    StatusBar,
    TouchableHighlight,
    View,
} from 'react-native';

import Postal from 'postal';

import Sha256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';
import Ionicons from 'react-native-vector-icons/Ionicons';

import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import TSTextInput from 'shared-modules/TSTextInput';
import Env from 'shared-modules/Env';
import IconNames from 'shared-modules/IconNames';
import BusyIndicator from 'shared-modules/BusyIndicator';

import Connector from '../../Common/Connector';
import Realm from '../../Common/Realm/RealmSingleton';

let TSButton = React.createClass({
    render() {
        var field, fontSize;

        if (this.props.children == "Clear All") {
            fontSize = "20";
        } else {
            fontSize = "40";
        }

        if (this.props.children == "Back") {
            field = <Ionicons name="md-arrow-back"
                              size={50}
                              color="#FFFFFF"
            />;
        } else {
            field = <TSText fontSize={fontSize} color="#FFFFFF">{this.props.children}</TSText>;
        }

        return (
            <TouchableHighlight style={styles.btn} underlayColor="#A9B1B9"
                                onPress={this.props.onPress}>
                <View>{field}</View>
            </TouchableHighlight>
        );
    }
});

module.exports = React.createClass({
    getInitialState() {
        this._subs = [Postal.channel("external").subscribe("Authorization", this._onAuthorization),
            Postal.channel("external").subscribe("Connected", this._checkInstallation),
            Postal.channel("external").subscribe("Logout", this._Logout),
            Postal.channel("external").subscribe("CheckInstallation", this._onCheckInstallation)];

        this._SignUpBtn = {
            "buttonPosition": "R",
            "buttonText": "Sign up",
            onPress: () => this.props.navigator.push({
                title: 'SignUp',
                name: 'SignUp',
                component: require('./SignUp')
            })
        };

        this._ResetBtn = {
            "buttonPosition": "R",
            "buttonText": "Reset Passcode",
            onPress: () => this.props.navigator.push({
                title: 'ResetPasscode',
                name: 'ResetPasscode',
                component: require('./ResetPasscode'),
                passProps: {
                    truckId: this.state.truckId,
                    operatorId: Sha256(this.state.truckId).toString(Hex)
                }
            })
        };

        return {
            keyboards: [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["Clear All", "0", "Back"]],
            truckId: '',
            password: "",
            keyIn: [false, false, false, false, false, false], /* 6 digits password */
        }
    },

    componentWillMount() {
        AsyncStorage.getItem(Realm.LastLoginKey, (err, key) => {
            if (key) {
                this.setState({truckId: JSON.parse(key).truckId});
            }
        });
    },

    componentDidMount() {
    },

    componentWillReceiveProps(nextProps) {
        AsyncStorage.getItem(Realm.LastLoginKey, (err, key) => {
            this.setState({
                truckId: key ? JSON.parse(key).truckId : "",
                password: "",
                keyIn: [false, false, false, false, false, false]
            });
        });
        this._checkInstallation();
    },

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    },

    _handleKeyboardPress(data) { // Keyboard input
        if (!Env.isConnected) {
            data = "Clear All";
            Alert.alert("Can't login", "No network connection!");
        }

        let password = this.state.password;
        let keyIn = this.state.keyIn;

        if (data === "Back") { // back one digit
            if (password) {
                password = password.slice(0, password.length - 1);
            }
        } else {
            if (data === "Clear All") {
                password = "";
            } else if (password.length < 6) {
                password = password.concat(data);
            }
        }

        for (let i = 0; i < password.length; i++) {
            keyIn[i] = true;
        }

        for (let i = password.length; i < 6; i++) {
            keyIn[i] = false;
        }

        this.setState({password: password, keyIn: keyIn}, () => this._authenticate(password));
    },

    render() {
        const buttons = [this.state.showSignUp ? this._SignUpBtn : this._ResetBtn];

        const keyIn = this.state.keyIn.map((yes, index) => {
            const name = yes ? IconNames.radioButtonOn : IconNames.radioButtonOff;
            return <Ionicons name={name}
                             size={30}
                             color="#ECECEC"
                             style={styles.keyIn}
                             key={index}
            />;
        });

        const keyboards = this.state.keyboards.map((row, index1) => {
            const keyboard = row.map((data, index2) =>
                <TSButton key={index2} onPress={this._handleKeyboardPress.bind(this, data)}>{data}</TSButton>
            );
            return <View style={styles.row} key={index1}>{keyboard}</View>;
        });

        return (
            <View style={styles.container}>
                <TSHeader buttons={buttons} hidePrinter={true}/>
                <View style={styles.truckId}>
                    <TSTextInput label="Truck ID"
                                 value={this.state.truckId}
                                 color="#ECECEC"
                                 keyboardType="email-address"
                                 onChangeText={this._onTruckIDChange}/>
                </View>
                <View style={styles.innerContainer}>
                    <TSText color="#ECECEC">Enter Passcode</TSText>
                    <View style={styles.row}>{keyIn}</View>
                    {keyboards}
                </View>
                <BusyIndicator/>
            </View>
        );
    },

    _authenticate(password) {
        if (password.length >= 6) {
            Connector.send({
                topic: 'Authentication',
                operatorId: Sha256(this.state.truckId).toString(Hex),
                password: Sha256(password).toString(Hex)
            });
        }
    },

    _onAuthorization(auth) {
        const routeStack = this.props.navigator.getCurrentRoutes();
        if (routeStack[routeStack.length - 1].name === "Login") {
            this.setState({password: '', keyIn: [false, false, false, false, false, false]});
            if (auth.token) {
                AsyncStorage.setItem(Realm.LastLoginKey, JSON.stringify({truckId: this.state.truckId}));
                Realm.switchToOperator(Sha256(this.state.truckId).toString(Hex));
                this.props.navigator.push({
                    title: 'Homepage',
                    name: 'Homepage',
                    component: require('./Homepage'),
                    passProps: {truckId: this.state.truckId}
                });
            } else {
                Alert.alert("Wrong password.  Try again!");
            }
        }
    },

    _onTruckIDChange(text) {
        this.setState({
            truckId: text,
            password: '',
            keyIn: [false, false, false, false, false, false]
        });
    },

    _checkInstallation() {
        Connector.send({topic: 'CheckInstallation'});
    },

    _onCheckInstallation(checkInstallation) {
        this.setState({showSignUp: checkInstallation.showSignUp});
    },

    _Logout() {
        Alert.alert("The truck id is currently logged in from another device", "Logout from the other device before try login again.");
        this.setState({password: '', keyIn: [false, false, false, false, false, false]}, () => {
            Postal.publish({channel: "internal", topic: 'Logout'});
            this.props.navigator.popToTop(); // logout, back to login page
        });
    }
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#3B709F",
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    keyIn: {
        margin: 10,
        marginBottom: 30,
        marginTop: 30,
    },
    btn: {
        margin: 10,
        padding: 5,
        //backgroundColor: '#ECECEC',
        backgroundColor: '#FBBA3A',
        justifyContent: 'center',
        alignItems: 'center',
        height: 100,
        width: 100,
        borderRadius: 50,
    },
    truckId: {
        marginLeft: 60,
        marginRight: 200,
    },
});

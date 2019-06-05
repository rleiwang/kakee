'use strict';

import React from 'react';

import {
    Alert,
    Image,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

import Postal from 'postal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import TSTextInput from 'shared-modules/TSTextInput';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import Button from 'shared-modules/Button';
import IconNames from 'shared-modules/IconNames';
import BusyIndicatorLoader from 'shared-modules/BusyIndicatorLoader';

import TSAds from './TSAds';
import Connector from './Connector';

const EMAIL_LINK = 'kakee@tristonetech.com';

const STATUS = {SAME_ADDRESS: 1, BOUNCED_EMAIL: 2, SIGNED_UP: 3};

export default React.createClass({
    _onSendInvite() {
        if (this.state.operatorEmail && this.state.userEmail) {
            const sent = Connector.send({
                topic: 'Referral',
                operatorEmail: this.state.operatorEmail,
                userEmail: this.state.userEmail
            });
            if (sent) {
                BusyIndicatorLoader.show("Sending ...")
            } else {
                Alert.alert("No network connection");
            }
        } else {
            Alert.alert("Please enter both emails");
        }
    },

    handleHeaderBtnOnPress(i) {
        if (i == 0) { // Cancel, back to previous
            this.props.navigator.pop();
            return;
        }
    },

    getInitialState() {
        return {
            operatorEmail: "",
            userEmail: "",
        };
    },

    componentWillMount() {
        // sets the status bar to white font
        this._subs = [Postal.channel('external').subscribe('Invitation',
            (invitation) => {
                BusyIndicatorLoader.hide();
                if (invitation.sent) {
                    Alert.alert("Thank you! Your invitation is sent.");
                } else {
                    let msg;
                    switch (invitation.status) {
                        case STATUS.SAME_ADDRESS:
                            msg = "Emails can't be the same.";
                            break;
                        case STATUS.BOUNCED_EMAIL:
                            msg = "Email has been bounced.";
                            break;
                        case STATUS.SIGNED_UP:
                            msg = "This food truck is our existing customer. Thank you!";
                            break;
                        default:
                            msg = "There is a problem sending out emails. Please try again later.";
                            break;
                    }
                    Alert.alert("Error", msg);
                }
            }
        )];
    },

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    },

    render() {
        let buttons = [{
            buttonPosition: "R",
            buttonIcon: "ios-close-circle-outline",
            onPress: () => this.props.navigator.pop()
        }];

        const step1TextPart1 = "Can't find your favorite Food Truck on map?";
        const step1TextPart2 = "Your favorite truck line is always long and it takes forever to get your food?";
        const step1TextPart3 = "You really don't want to have Taco's on Weds, because it's called Taco Tuesday for a reason!";

        const step2TextPart1 = "Help spread the word and expand our food truck network!";
        const step2TextPart2 = "We'll give you $50 if you send this coupon to your favorite food truck and they end up using Kakee after free trial!";

        const step3TextPart1 = "You win because you'll be able to place your order faster and get location updates in your favorite lunch app. " +
            "And they'll win because they'll have an awesome way to connect with their customers. " +
            "(Also, did we mention you’ll score $50 dollars!)";
        const step3TextPart2 = "Next time you're placing your order of amazingly spicy fish tacos, ask the guy for his email. " +
            "(Tell him it's for a promotion code for ";
        const step3TextPart3 = " on iPad, and that you're already seeing someone special, but you have a friend.... Or not.)";

        const step5TextPart1 = "Thanks for thinking of us and if you have any suggestion about our app or this offer, please ";
        const step5TextPart2 = ", or visit ";
        const step5TextPart3 = "Stay Foodish!";

        return (
            <View style={styles.container}>
                <TSHeader headerTitle="Kakee"
                          buttons={buttons}
                          hideConnection={true}/>
                <ScrollView style={styles.content}>
                    <View style={styles.flex1}>
                        <View style={styles.flex1}>
                            <TSTextInput label="Truck Email"
                                         keyboardType="email-address"
                                         onChangeText={text => this.setState({operatorEmail: text})}/>
                            <TSTextInput label="My Email"
                                         onChangeText={text => this.setState({userEmail: text})}/>
                            <View style={styles.marginTop10}/>
                            <Button onPress={this._onSendInvite}>
                                <View style={styles.row}>
                                    <Ionicons name={IconNames.mail} size={25} color='#3B709F'>
                                    </Ionicons>
                                    <View style={styles.flex1}>
                                        <TSText fontNormal={true} color="#3B709F">Send Promotion Code
                                            to {this.state.operatorEmail}</TSText>
                                    </View>
                                </View>
                            </Button>
                            <View style={styles.marginTop10}/>
                            <View style={styles.marginTop10}/>
                            <View style={styles.marginTop10}/>
                            <View style={styles.rowAlignTop}>
                                <View style={styles.marginLeftRight}>
                                    <TSText ontNormal={true} color="#F96121">*</TSText>
                                </View>
                                <View style={styles.flex1}>
                                    <TSText fontNormal={true} color="#F96121">{step1TextPart1}</TSText>
                                </View>
                            </View>
                            <View style={styles.rowAlignTop}>
                                <View style={styles.marginLeftRight}>
                                    <TSText ontNormal={true} color="#F96121">*</TSText>
                                </View>
                                <View style={styles.flex1}>
                                    <TSText fontNormal={true} color="#F96121">{step1TextPart2}</TSText>
                                </View>
                            </View>
                            <View style={styles.rowAlignTop}>
                                <View style={styles.marginLeftRight}>
                                    <TSText ontNormal={true} color="#F96121">*</TSText>
                                </View>
                                <View style={styles.flex1}>
                                    <TSText fontNormal={true} color="#F96121">{step1TextPart3}</TSText>
                                </View>
                            </View>
                            <View style={styles.marginTop10}/>
                            <TSText fontNormal={true}>{step2TextPart1}</TSText>
                            <View style={styles.marginTop10}/>
                            <TSText fontNormal={true}>{step2TextPart2}</TSText>
                            <View style={styles.marginTop10}/>
                            <TSText fontNormal={true}>{step3TextPart1}</TSText>
                            <View style={styles.marginTop10}/>
                            <TSText fontNormal={true}>{step3TextPart2}
                                <TSText fontNormal={true} color="#FFAA00">Kakee Food Truck Operator </TSText>
                                <Image style={{width: 20, height: 20, borderRadius: 5}}
                                       source={require('../images/operator.png')}/>
                                <TSText fontNormal={true}>{step3TextPart3}</TSText>
                            </TSText>
                            <View style={styles.marginTop10}/>
                            <TSText fontNormal={true}>{step5TextPart1}
                                <TSText fontNormal={true} color="#3B709F"
                                        onPress={() => Linking.openURL(`mailto:${EMAIL_LINK}`)}>
                                    <Ionicons name={IconNames.mail} size={25} color='#3B709F'/>
                                    {` ${EMAIL_LINK}`}
                                </TSText>
                                <TSText fontNormal={true}>{step5TextPart2}</TSText>
                                <TSText fontNormal={true} color="#3B709F"
                                        onPress={() => Linking.openURL('https://www.facebook.com/KakeeFoodTruck/')}>
                                    Kakee <Ionicons name="logo-facebook" size={25} color='#3B709F'/>
                                </TSText>
                                <TSText fontNormal={true}>{" for more information."}</TSText>
                            </TSText>
                            <View style={styles.marginTop10}/>
                            <TSText fontNormal={true}>{step5TextPart3}</TSText>
                            <View style={styles.marginTop10}/>
                        </View>
                    </View>
                </ScrollView>
                <TSAds style={styles.bannerArea}/>
            </View>
        );
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
    rowAlignTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    content: {
        margin: 5,
        marginTop: 10,
        flex: 1,
    },
    bannerArea: {
        height: 50,
    },
    marginTop10: {
        marginTop: 10,
    },
    marginTop20: {
        marginTop: 20,
    },
    flex1: {
        flex: 1,
    },
    marginLeftRight: {
        marginLeft: 5,
        marginRight: 3,
    },
});

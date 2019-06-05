'use strict';

import React,{
    Component,
    PropTypes
} from 'react';

import {
    InteractionManager,
    StyleSheet,
    View,
    TouchableHighlight,
    Alert,
    Linking,
} from 'react-native';

import Postal from 'postal';
import Ionicons from 'react-native-vector-icons/Ionicons';

import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import TSBadge from 'shared-modules/TSBadge';
import IconNames from 'shared-modules/IconNames';

import ManageProfile from './ManageProfile';
import ManageTax from './ManageTax';
import ManageSpecialOffer from './ManageSpecialOffer';
import ManageOutOfOrder from './ManageOutOfOrder';
import ManageComments from './ManageComments';
import ManageAnnoucement from './ManageAnnoucement';
import ManageAds from './ManageAds';
import ManageBillpay from './ManageBillpay';

import ManageBluetooth from './ManageBluetooth';

import Realm from '../../Common/Realm/RealmSingleton';
import Connector from '../../Common/Connector';
const EMAIL_LINK = 'kakee@tristonetech.com';

class TSLeftPanelBtn extends Component {
    render() {

        var fontNormal = this.props.selected ? false : true;
        var badge = this.props.data.badge ? true : false;

        return (
            <View style={styles.rowSeparatorBottom}>
                <TouchableHighlight style={[styles.vCenter, styles.btn, this.props.selected && styles.selectedBtn]}
                                    underlayColor="#A9B1B9"
                                    onPress={this.props.onPress}>
                    <View style={styles.row}>
                        <TSText fontNormal={fontNormal}>{this.props.data.name}</TSText>
                        <View style={styles.flex1}/>
                        {badge && <TSBadge>{this.props.data.badge.toString()}</TSBadge>}
                    </View>
                </TouchableHighlight>
            </View>
        )
    }
}

export default class extends Component {
    constructor(props) {
        super(props);

        this._subs = [Postal.channel("external").subscribe("UnreadSummary", this._onUnreadSummary.bind(this))];

        this.state = {
            saveWarning: false,
            selectedLeftPanelBtn: 0,
            taxBadgeNumber: 0,
            unread: 0,
            badgeSpecialOffers: props.specialOffer ? 1 : 0,
            badgeAnnouncement: props.announcement ? 1 : 0,
            badgeAds: 0,
            badgeOOO: props.oooItems ? Object.keys(props.oooItems).length : 0,
            badgeBillPays: 0,
        }
    }

    componentWillMount() {
        InteractionManager.runAfterInteractions(() => {
            this.setState({
                ...this.loadCityTaxesFromDB(),
            });
        });

        if (this.props.hasOwnProperty("landingPage")) {
            switch (this.props.landingPage) {
                case 'tax':
                    this.setState({selectedLeftPanelBtn: 1});
                    break;
                case 'special':
                    this.setState({selectedLeftPanelBtn: 2});
                    break;
                case 'announcement':
                    this.setState({selectedLeftPanelBtn: 4});
                    break;
                case 'ooo':
                    this.setState({selectedLeftPanelBtn: 6});
                    break;
                case 'billpay':
                    this.setState({selectedLeftPanelBtn: 8});
                    break;
            }
        }
        Connector.send({topic: 'UnreadSummary'});
    }

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    }

    loadCityTaxesFromDB() {
        const taxes = Realm.loadCityTax();
        if (taxes && taxes.length > 0) {
            return {taxBadgeNumber: Object.keys(JSON.parse(taxes[0].cityTax)).length};
        }

        return {};
    }

    handleLeftPanelOnPress(i) { // left panel button press
        if (this.state.saveWarning) {
            Alert.alert(
                null,
                'You have unsaved data, do you want continue?',
                [
                    {text: 'Yes', onPress: () => this.setState({selectedLeftPanelBtn: i, saveWarning: false,})},
                    {text: 'No'},
                ]
            );
        } else {
            this.setState({selectedLeftPanelBtn: i});
        }
    }

    handleContentProfile(saveWarning) {

        this.setState({saveWarning: saveWarning});

    }

    handleContentTax(saveWarning, badgeTaxCities) {
        this.setState({saveWarning: saveWarning});

        if (badgeTaxCities != null) {
            this.setState({taxBadgeNumber: badgeTaxCities});
        }
    }

    _onSpecialOfferChange(saveWarning, badge) {
        this.setState({
            saveWarning: saveWarning,
            badgeSpecialOffers: badge
        });
    }

    _onAnnouncementChange(badge) {
        this.setState({badgeAnnouncement: badge});
    }

    handleContentOutOfOrder(saveWarning, badge) {
        this.setState({saveWarning: saveWarning});

        if (badge != null) {
            this.setState({badgeOOO: badge});
        }
    }

    render() {
        const hdrButtons = [{
            "buttonPosition": "R",
            "buttonIcon": IconNames.home,
            onPress: () => {
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
                    /* back to home page without saving */
                    this.props.navigator.pop();
                }
            }
        }];

        const leftPanelBtns = [{name: "Profile"},
            {name: "City Tax", badge: this.state.taxBadgeNumber},
            {name: "Special Offer", badge: this.state.badgeSpecialOffers},
            {name: "Ads", badge: this.state.badgeAds},
            {name: "Announcement", badge: this.state.badgeAnnouncement},
            {name: "Chats", badge: this.state.unread},
            {name: "Out of Order", badge: this.state.badgeOOO},
            {name: "Bluetooth", badge: 0},
            {name: "Bill Pay", badge: this.state.badgeBillPays}];

        const leftBtns = leftPanelBtns.map((data, index) => {
            const selected = index == this.state.selectedLeftPanelBtn ? true : false;
            return <TSLeftPanelBtn key={index}
                                   rowIndex={index}
                                   data={data}
                                   selected={selected}
                                   onPress={this.handleLeftPanelOnPress.bind(this, index)}
            />
        });

        return (
            <View style={styles.container}>
                <TSHeader headerTitle='Management'
                          buttons={hdrButtons}/>
                <View style={styles.content}>
                    <View style={styles.leftPanel}>
                        {leftBtns}
                        <View style={styles.flex1}/>
                        <View style={styles.marginBottom}>
                            <TSText fontNormal={true}>{"Visit "}
                                <TSText fontNormal={true} color="#3B709F"
                                        onPress={() => Linking.openURL('https://www.facebook.com/KakeeFoodTruck/')}>
                                    Kakee <Ionicons name="logo-facebook" size={25} color='#3B709F'/>
                                </TSText>
                                <TSText fontNormal={true}>{" or contact us "}
                                    <TSText color='#3B709F'
                                            onPress={() => Linking.openURL(`mailto:${EMAIL_LINK}`)}>
                                        <Ionicons name={IconNames.mail} size={25} color='#3B709F'/>
                                        {` ${EMAIL_LINK}`}</TSText>
                                    <TSText fontNormal={true}> for more information</TSText>
                                </TSText>
                            </TSText>
                        </View>
                    </View>
                    <View style={styles.rightPanel}>
                        {this.state.selectedLeftPanelBtn == 0 &&
                        <ManageProfile navigator={this.props.navigator}
                                       profile={this.props.profile}
                                       onChange={this.handleContentProfile.bind(this)}/>}
                        {this.state.selectedLeftPanelBtn == 1 &&
                        <ManageTax onChange={this.handleContentTax.bind(this)}/>}
                        {this.state.selectedLeftPanelBtn == 2 &&
                        <ManageSpecialOffer onChange={this._onSpecialOfferChange.bind(this)}
                                            specialOffer={this.props.specialOffer}/>}
                        {this.state.selectedLeftPanelBtn == 3 &&
                        <ManageAds/>}
                        {this.state.selectedLeftPanelBtn == 4 &&
                        <ManageAnnoucement onChange={this._onAnnouncementChange.bind(this)}/>}
                        {this.state.selectedLeftPanelBtn == 5 &&
                        <ManageComments conversations={this.state.conversations} onRead={this._onRead.bind(this)}/>}
                        {this.state.selectedLeftPanelBtn == 6 &&
                        <ManageOutOfOrder onChange={this.handleContentOutOfOrder.bind(this)}/>}
                        {this.state.selectedLeftPanelBtn == 7 &&
                        <ManageBluetooth />}
                        {this.state.selectedLeftPanelBtn == 8 &&
                        <ManageBillpay/>}
                    </View>
                </View>
            </View>
        );
    }

    _onUnreadSummary(summaries) {
        // unread: [ { id: '', unread: 0, name: null } ]
        this.setState({
            conversations: summaries.unread,
            unread: this._sumUnread(summaries.unread)
        });
    }

    _sumUnread(unread) {
        return unread.reduce((sum, cvs) => sum + cvs.unread, 0);
    }

    _onRead(cvs) {
        this.setState({unread: this.state.unread - cvs.unread}, () => cvs.unread = 0);
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vCenter: {
        justifyContent: 'center',
    },
    leftPanel: {
        flex: 25,
        margin: 4,
        borderRightWidth: 1,
        borderRightColor: '#A9B1B9',
    },
    rightPanel: {
        flex: 75,
        margin: 4,
    },
    rowSeparatorBottom: {
        borderBottomWidth: 1,
        borderBottomColor: "#A9B1B9",
    },
    btn: {
        height: 50,
        padding: 4,
        margin: 4,
    },
    selectedBtn: {
        backgroundColor: '#A9B1B9',
    },
    flex1: {
        flex: 1,
    },
    marginBottom: {
        marginBottom: 10,
    },
});
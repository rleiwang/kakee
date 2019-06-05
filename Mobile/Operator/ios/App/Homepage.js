'use strict';

import React from 'react';

import {
    Alert,
    InteractionManager,
    NativeModules,
    StyleSheet,
    ScrollView,
    Text,
    TouchableHighlight,
    View
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import MapView from 'react-native-maps';
import Postal from 'postal';
import numeral from 'numeral';

import TSHeader from 'shared-modules/TSHeader';
import TSModalHeader from 'shared-modules/TSModalHeader';
import TSText from 'shared-modules/TSText';
import TSModal from 'shared-modules/TSModal';
import Button from 'shared-modules/Button';
import IconNames from 'shared-modules/IconNames';
import DeviceInfo from 'shared-modules/DeviceInfo';

import PayPalLogin from './PayPalLogin';
import OrderManagement from './OrderManagement';
import Management from './Management';
import MenuCategory from './MenuCategory';
import Report from './Report';
import MapLocation from './MapLocation';

import Realm from '../../Common/Realm/RealmSingleton';
import GeoLocation from '../../Common/GeoLocation';
import Connector from '../../Common/Connector';
import AsyncHandler from './AsyncHandler';
import OperatorEnv from './OperatorEnv';
import Square from './Square';

// a mile range
//let LATITUDE_DELTA = 0.0562;
//let LONGITUDE_DELTA = 0.048;

// street range
let LATITUDE_DELTA = 0.008243894505248761;
let LONGITUDE_DELTA = 0.010471345283392;
let RED_COLOR = "#F96121";
let GREEN_COLOR = "#448776"; //"#B5CD93";
let DEFAULT_COLOR = "#5A5B5D";
const MAP_MARGIN = 40;

let TSButton = React.createClass({
    render() {
        return (
            <TouchableHighlight style={styles.btn} underlayColor="#A9B1B9"
                                onPress={this.props.onPress}>
                <Text style={styles.btnLabel}>{this.props.children}</Text>
            </TouchableHighlight>
        );
    }
});

const TSSection = React.createClass({
    render() {
        return (
            <View style={styles.section}>
                <View style={styles.flex1}>
                    <Button onPress={this.props.onPress}>
                        {!this.props.noCheckmark && (this.props.attention ?
                            <Ionicons name="md-close" size={25} color={RED_COLOR}/> :
                            <Ionicons name="md-checkmark" size={25} color={GREEN_COLOR}/>)}
                        <View style={[styles.flex1, styles.text]}>
                            {this.props.attention ?
                                <TSText fontNormal={true} color={RED_COLOR}>{this.props.children}</TSText> :
                                <TSText fontNormal={true}>{this.props.children}</TSText>}
                        </View>
                        {this.props.attention ? <Ionicons name="ios-arrow-forward" size={25} color={RED_COLOR}/> :
                            <Ionicons name="ios-arrow-forward" size={25} color={DEFAULT_COLOR}/>}
                    </Button>
                </View>
            </View>
        );
    }
});

let TSTile = React.createClass({

    render() {
        return (
            <View style={styles.tile}>
                <TouchableHighlight underlayColor="#A9B1B9" onPress={this.props.onPress} style={styles.flex1}>
                    <View style={[styles.column, styles.flex1]}>
                        <View style={styles.tileLabel}><TSText>{this.props.label}</TSText></View>
                        <View style={styles.tileImage}>
                            <Ionicons name={this.props.imgSource}
                                      size={70}
                                      color={this.props.color}
                                      style={styles.imageIcon}/>
                        </View>
                    </View>
                </TouchableHighlight>
            </View>
        );
    }
});

let TSModalTaxRow = React.createClass({

    render() {

        return (
            <View>
                <TouchableHighlight style={styles.border} onPress={this.props.onPress}>
                    <View style={styles.rowModal}>
                        <View style={styles.rowModalCity}>
                            <TSText>{this.props.rowData}</TSText>
                        </View>
                        <View style={styles.rowModalTax}>
                            <TSText>{this.props.cityTaxes[this.props.rowData] + "%"}</TSText>
                        </View>
                    </View>
                </TouchableHighlight>
            </View>
        )
    }
});

module.exports = React.createClass({
    getInitialState() {
        this._subs = [Postal.channel("external").subscribe("PreFlightCheckList", this._preFlightCheckList),
            Postal.channel("external").subscribe("FreeTrial", this._onFreeTrial),
            Postal.channel("external").subscribe("UnpaidBill", this._onUnpaidBill),
            Postal.channel("external").subscribe("Authorized", this._onAuthorized),
            Postal.channel("internal").subscribe("Menu", this._menuPublished)];

        return {
            currentRegion: null,
            isPayPalLogin: OperatorEnv.isPayPalEnabled,
            businessHourSeqId: 0,
            currentCity: undefined,
            businessStatus: "",
            cityTaxRows: [],
            selectCityModal: null,
            calledFromMap: true, /* view Map modal can come from map or open button */
            viewMapModal: false,
            businessTimestamp: 0,
            hasOOO: false,
            hasPendingBill: false,
            billMsg: ''
        }
    },

    componentWillMount() {
        this.loadCityTaxesFromDB();
        this.loadBusinessHourFromDB(Realm.loadBusinessHour());

        InteractionManager.runAfterInteractions(() => {
            this._loadOrdersFromDB();
            const savedRegion = GeoLocation.whereAmI();
            if (savedRegion) {
                // use last saved location
                this.setState({
                    currentRegion: savedRegion,
                    marker: {
                        latitude: savedRegion.latitude,
                        longitude: savedRegion.longitude
                    }
                });
            } else {
                const GPSLocation = GeoLocation.myGPSLocation();
                if (GPSLocation) {
                    // use gps location
                    this.setState({
                        currentRegion: {
                            ...GPSLocation,
                            latitudeDelta: LATITUDE_DELTA,
                            longitudeDelta: LONGITUDE_DELTA,
                        },
                        marker: GPSLocation,
                    });
                }
            }
        });

        this.setState({isPayPalLogin: OperatorEnv.isPayPalEnabled});
        Connector.send({topic: 'PreFlightCheckList'});
    },

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    },

    /* recheck city taxes after return back to home page */
    componentWillReceiveProps(nextProps) {
        const routeStack = this.props.navigator.getCurrentRoutes();
        if (routeStack[routeStack.length - 1].name === "Homepage") {
            this.loadCityTaxesFromDB();

            this.setState({isPayPalLogin: OperatorEnv.isPayPalEnabled});
            Connector.send({topic: 'PreFlightCheckList'});
        }
    },

    _onAuthorized(status) {
        if (this.state.businessStatus === "O" || (status === 'O')) {
            const profile = Realm.loadProfile();
            if (profile && profile.length > 0 && profile[0].sq_token) {
                Square.setAccessToken(profile[0].sq_token, () => {
                });
            }
            Connector.send({
                topic: 'Open',
                taxRate: this.state.cityTaxes[this.state.currentCity],
                city: this.state.currentCity,
                pending: this._openOrders ? this._openOrders.length : 0,
                paypal: (profile && profile.length > 0) ? profile[0].paypal : null,
                square: (profile && profile.length > 0) ? profile[0].sq_api : null
            });
        }
    },

    _onFreeTrial(free) {
        this.setState({billMsg: `Free trial ends in ${free.daysLeft} days`});
        this._paid = true;
    },

    _onUnpaidBill(bill) {
        if (bill.amount > 0) {
            this._paid = Date.now() <= bill.dueDate;
            const amount = numeral(bill.amount).format('$0,0.00');
            const dueDate = new Date(bill.dueDate).toLocaleDateString(DeviceInfo.info().locale);
            this.setState({billMsg: `Due ${amount} before ${dueDate}`, hasPendingBill: true});
        } else {
            this.setState({billMsg: 'No Pending Bill Pay', hasPendingBill: false});
            this._paid = true;
        }
    },

    _menuPublished(publishedMenu) {
        this.setState({
            publishedMenus: publishedMenu,
            hasOOO: false,
            oooItems: {}
        });
    },

    _preFlightCheckList(checkList) {
        let menus;
        let hasOOO = false;
        let oooItems = {};

        if (checkList.publishedMenu) {
            menus = {
                menuVersion: checkList.publishedMenu.version,
                menus: JSON.parse(checkList.publishedMenu.menu).menu
            };
            for (let item of menus.menus) {
                if (item.isOOO) {
                    if (!oooItems.hasOwnProperty(item.name)) {
                        oooItems[item.name] = "";
                    }
                    hasOOO = true;
                } else if (item.hasOwnProperty("subItems")) {
                    for (let key in item.subItems) {
                        if (item.subItems[key].isOOO) {
                            if (!oooItems.hasOwnProperty(item.subItems[key].name)) {
                                oooItems[item.subItems[key].name] = "";
                            }
                            hasOOO = true;
                        }
                    }
                }
            }
        }

        let todaySpecialOffer = false;
        if (checkList.specialOffer) {
            let today = Date.now();

            if (today >= checkList.specialOffer.startDate &&
                today <= checkList.specialOffer.endDate) {
                todaySpecialOffer = true;
            }
        }

        this.setState({
            profile: checkList.profile,
            publishedMenus: menus,
            specialOffer: checkList.specialOffer,
            todaySpecialOffer: todaySpecialOffer,
            announcement: checkList.announcement,
            hasOOO: hasOOO,
            oooItems: oooItems,
        })
    },

    loadPreferences(key) {
        const pref = Realm.getPreferences(key);
        if (pref.length > 0) {
            return pref[0].value;
        }
        return undefined;
    },

    loadCityTaxesFromDB() {
        let taxes = Realm.loadCityTax();
        let cityTaxes = undefined;
        let currentCity = this.loadPreferences("city");

        if (taxes.length > 0) {
            cityTaxes = JSON.parse(taxes[0].cityTax);
            if (Object.keys(cityTaxes).length > 0) {
                if (!currentCity) {
                    currentCity = Object.keys(cityTaxes)[0];
                }
            }
        }

        this.setState({cityTaxes: cityTaxes, currentCity: currentCity});
    },

    loadBusinessHourFromDB(data) {
        if (data && data.length > 0) {
            this.setState({
                businessHourSeqId: data[0].seqId,
                businessStatus: data[0].status,
                currentCity: data[0].taxCityKey,
                businessTimestamp: data[0].timestamp,
            });
        } else {
            this.setState({businessStatus: "C"});
        }
    },

    // open modal
    handleSelectCityTax() {
        this.setState({selectCityModal: "Yes",});
    },

    // cancel
    handleModalBtnOnPress() {
        this.setState({selectCityModal: null});
    },

    _saveBusHour(status, city) {
        var busHour = {};

        busHour.seqId = this.state.businessHourSeqId + 1;
        busHour.timestamp = Date.now();
        var date = new Date();
        busHour.localdttm = date.toString();
        busHour.status = status;
        busHour.taxCityKey = city;

        //RealmManager.saveBusinessHour(busHour, () => {
        //});

        this.setState({
            businessHourSeqId: this.state.businessHourSeqId + 1,
            businessStatus: status,
            businessTimestamp: busHour.timestamp,
        });

    },

    // return from modal
    handleSelectCity(key) {
        Realm.savePreferences("city", key);

        // save business hours
        this._saveBusHour(this.state.businessStatus, key);

        this.setState({
            businessHourSeqId: this.state.businessHourSeqId + 1,
            currentCity: key,
            selectCityModal: null,
        });
    },

    handleMobileOrderOpenClose() {
        var status;

        if (this.state.businessStatus === "C") {

            // validate profile, menu, tax, paypal, and location are required before open business. PayPal is optional.
            let errorMsg;
            let warningOnly = true;

            if (!this.state.profile || !this.state.profile.name) {
                errorMsg = "Profile is required.";
                warningOnly = false;
            }

            if (!this.state.publishedMenus) {
                if (errorMsg) {
                    errorMsg += "\rPublished menu is required.";
                } else {
                    errorMsg = "Published menu is required.";
                }
                warningOnly = false;
            }

            if (!this.state.currentCity) {
                if (errorMsg) {
                    errorMsg += "\rCity Tax is required.";
                } else {
                    errorMsg = "City Tax is required.";
                }
                warningOnly = false;
            }

            if (!this.state.marker) {
                if (errorMsg) {
                    errorMsg += "\rTruck location is required.";
                } else {
                    errorMsg = "Truck location is required.";
                }
                warningOnly = false;
            }

            if (this.state.profile && this.state.profile.ccp === Realm.PaymentType.PAYPAL) {
                if (!this.state.isPayPalLogin) {
                    if (errorMsg) {
                        errorMsg += "\rPayPal login is required to process credit card.";
                    } else {
                        errorMsg = "PayPal login is required to process credit card.";
                    }
                }
            }

            if (!this._paid) {
                if (errorMsg) {
                    errorMsg += "\rThere is pending billpay";
                } else {
                    errorMsg = "There is pending billpay";
                }
                warningOnly = false;
            }


            if (errorMsg) {
                if (warningOnly) {
                    Alert.alert(
                        "Warning",
                        errorMsg,
                        [
                            {
                                text: 'Continue without PayPal', onPress: () => {
                                status = "O";
                                if (this.state.marker) {
                                    this._onAuthorized(status);
                                } else {
                                    this.setState({calledFromMap: false, viewMapModal: true});
                                }
                                this._saveBusHour(status, this.state.currentCity);
                            }
                            },
                            {text: 'Cancel'},
                        ]
                    );
                } else {
                    Alert.alert("Cannot Open Mobile Ordering!", errorMsg);
                    return;
                }
            } else {
                status = "O";
                if (this.state.marker) {
                    this._onAuthorized(status);
                } else {
                    this.setState({calledFromMap: false, viewMapModal: true});
                }
                this._saveBusHour(status, this.state.currentCity);
            }
        } else {
            status = "C";
            Connector.send({topic: 'Close'});
            this._saveBusHour(status, this.state.currentCity);
        }
    },

    _gotoOrderManagement(){
        if (!this._paid) {
            Alert.alert("Please check bill pay!");
            return;
        }
        let cityTax = this.state.currentCity ? this.state.cityTaxes[this.state.currentCity] : undefined;
        if (!cityTax) {
            Alert.alert("Error", "Set up city tax before taking orders.");
            return;
        }

        let publishedMenus = this.state.publishedMenus;

        if (!publishedMenus) {
            publishedMenus = this._loadPublishedMenuFromDB();
            if (!publishedMenus) {
                Alert.alert("Error", "Set up and publish menus before taking orders.");
                return;
            }
        }

        if (this._closedOrders) {
            this.props.navigator.push({
                title: 'Order Management',
                name: 'OrderManagement',
                component: OrderManagement,
                passProps: {
                    businessTimestamp: this.state.businessTimestamp,
                    cityTax: {
                        city: this.state.currentCity,
                        taxRate: numeral().unformat(`${cityTax}%`)
                    },
                    publishedMenus: publishedMenus,
                    specialOffer: this.state.specialOffer,
                    allOrders: this._allOrders,
                    readyOrders: this._readyOrders,
                    openOrders: this._openOrders,
                    closedOrders: this._closedOrders,
                    canceledOrders: this._canceledOrders,
                    pendingOrders: this._pendingOrders,
                    profile: this.state.profile
                }
            });
        }
    },

    report(){
        this.props.navigator.push({
            title: 'Report',
            name: 'Report',
            component: Report,
            passProps: {}
        });
    },

    _gotoMenuSetup() {
        this.props.navigator.push({
            title: 'MenuCategory',
            name: 'MenuCategory',
            component: MenuCategory,
            passProps: {
                publishedMenus: this.state.publishedMenus ? this.state.publishedMenus.menus : []
            }
        });
    },

    _handleMapModal() {
        this.setState({calledFromMap: true, viewMapModal: true});
    },


    render() {
        let headerTitle;

        headerTitle = this.props.truckId + " Homepage";
        /*if (this.state.profile && this.state.profile.name) {
         headerTitle = this.state.profile.name + " Homepage";
         } else {
         headerTitle = "Homepage";
         }*/

        let buttons = [{
            "buttonPosition": "R",
            "buttonText": "Logout",
            "buttonIcon": IconNames.logOut,
            onPress: () => {
                Postal.publish({channel: "internal", topic: 'Logout'});
                this.props.navigator.popToTop(); // logout, back to login page
            }
        }];

        let strPayment, strBusStatus, strBtnMobileOrder;

        if (this.state.isPayPalLogin) {
            strPayment = "PayPal is logged in for credit card process";
        } else {
            strPayment = "PayPal is not logged in - can't process credit card!";
        }

        if (this.state.businessStatus === "O") {
            strBusStatus = "Open for Mobile Ordering";
            strBtnMobileOrder = "Close Mobile Ordering";
        } else {
            strBusStatus = "Closed for Mobile Ordering";
            strBtnMobileOrder = "Open Mobile Ordering";
        }

        var modalBtns = [{
            "buttonPosition": "L",
            "buttonText": "Cancel",
            onPress: () => {
                this.handleModalBtnOnPress();
            }
        }];

        let taxRows;
        if (this.state.cityTaxes) {
            taxRows = Object.keys(this.state.cityTaxes).map((key, index) =>
                <TSModalTaxRow key={index}
                               rowIndex={index}
                               rowData={key}
                               cityTaxes={this.state.cityTaxes}
                               onPress={this.handleSelectCity.bind(this, key)}
                />);
        }

        let {profile, publishedMenus, isPayPalLogin, currentRegion, marker} = this.state;
        const mapHeight = this.state.containerHeight - this.state.headerHeight - this.state.leftPanelHeight - MAP_MARGIN;
        return (
            <ScrollView style={styles.container} onLayout={this._onContainerLayout}>
                <TSHeader headerTitle={headerTitle}
                          buttons={buttons} onLayout={this._onHeaderLayout}/>
                <View style={styles.row}>
                    <ScrollView style={styles.flex1}>
                        <View style={styles.panel}>
                            <View style={styles.flex1} onLayout={this._onLeftPanelLayout}>
                                <View style={[styles.section, (this.state.businessStatus === '' && styles.unknown),
                                    (this.state.businessStatus === "O" && styles.opened),
                                    (this.state.businessStatus === "C" && styles.closed)]}>
                                    <View style={styles.flex1}>
                                        <TSText fontNormal={true} color="#FFFFFF">{strBusStatus}</TSText>
                                    </View>
                                    <TSButton onPress={this.handleMobileOrderOpenClose}>{strBtnMobileOrder}</TSButton>
                                </View>
                                <TSSection attention={!profile || !profile.name}
                                           onPress={this._gotoManagementPage.bind(this, 'profile')}>
                                    {this._renderProfile()}
                                </TSSection>
                                <TSSection attention={!publishedMenus} onPress={this._gotoMenuSetup}>
                                    {this._renderMenus(publishedMenus)}
                                </TSSection>
                                <TSSection attention={!this.state.currentCity}
                                           onPress={this._handleTransferTaxPage}>
                                    {this._renderCityTax()}
                                </TSSection>
                                {this.state.profile && this.state.profile.ccp === Realm.PaymentType.PAYPAL &&
                                <TSSection attention={!isPayPalLogin} onPress={this._gotoPayPalLogin}>
                                    {strPayment}
                                </TSSection>}
                            </View>
                            <View style={[styles.map, {height: mapHeight}]}>
                                {marker ? <TSText fontNormal={true}>Truck Location</TSText> :
                                    <TSText fontNormal={true} color={RED_COLOR}>No Truck Location</TSText>}
                                <MapView style={styles.flex1} region={currentRegion} showsUserLocation={false}
                                         showsPointsOfInterest={false} onPress={this._handleMapModal}>
                                    <MapView.Marker coordinate={marker}/>
                                </MapView>
                            </View>
                        </View>
                    </ScrollView>
                    <TSModal visible={this.state.viewMapModal} width={500}>
                        <MapLocation region={this.state.currentRegion} onSetRegion={this._onSetRegion}
                                     onCancel={() => this.setState({viewMapModal: false})}/>
                    </TSModal>
                    <TSModal visible={this.state.selectCityModal === 'Yes'} width={500}>
                        <TSModalHeader headerTitle='Select City Tax'
                                       buttons={modalBtns}
                                       onPress={this.handleModalBtnOnPress}/>
                        {taxRows}
                    </TSModal>
                    <View style={styles.flex1}>
                        <View style={styles.flex1}>
                            <View style={[styles.panel, styles.column, styles.flex1]}>
                                <View style={[styles.row, styles.flex1, styles.marginRight5]}>
                                    <TSTile label="Order Management" imgSource={IconNames.restaurant} color="#FBBA3A"
                                            onPress={this._gotoOrderManagement}/>
                                    <TSTile label="Report" imgSource={IconNames.pie} color="#EC9172"
                                            onPress={this.report}/>
                                </View>
                                <View style={[styles.row, styles.flex1, styles.marginRight5]}>
                                    <TSTile label="Management" imgSource={IconNames.cog} color="#A39C98"
                                            onPress={this._gotoManagementPage}/>
                                    <TSTile label="Menu Setup" imgSource="ios-create" color="#878C6A"
                                            onPress={this._gotoMenuSetup}/>
                                </View>
                            </View>
                        </View>
                        <View style={styles.panel}>
                            <TSSection noCheckmark={true} attention={this.state.todaySpecialOffer}
                                       onPress={this._gotoManagementPage.bind(this, 'special')}>
                                {this._renderSpecialOffer()}
                            </TSSection>
                            <TSSection noCheckmark={true} attention={this.state.hasOOO}
                                       onPress={this._gotoManagementPage.bind(this, 'ooo')}>
                                {this._renderOOO()}
                            </TSSection>
                            <TSSection noCheckmark={true} attention={this.state.announcement}
                                       onPress={this._gotoManagementPage.bind(this, 'announcement')}>
                                {this._renderAnnouncement()}
                            </TSSection>
                            <TSSection noCheckmark={true} attention={this.state.hasPendingBill}
                                       onPress={this._gotoManagementPage.bind(this, 'billpay')}>
                                {this.state.billMsg}
                            </TSSection>
                        </View>
                    </View>
                </View>
            </ScrollView>
        );
    },

    _onHeaderLayout(e) {
        let layout = e.nativeEvent.layout;
        this.setState({headerHeight: layout.height});
    },

    _onLeftPanelLayout(e) {
        let layout = e.nativeEvent.layout;
        this.setState({leftPanelHeight: layout.height});
    },

    _onContainerLayout(e) {
        let layout = e.nativeEvent.layout;
        this.setState({containerHeight: layout.height});
    },

    _renderProfile() {
        if (this.state.profile && this.state.profile.name) {
            return "Profile - " + this.state.profile.name;
        }

        return "Profile is not set up!";
    },

    _renderMenus(menus) {
        if (menus) {
            let categories = {};
            let names = '';
            for (let item of menus.menus) {
                if (!categories.hasOwnProperty(item.category)) {
                    categories[item.category] = "";
                    if (names) {
                        names += ", " + item.category;
                    } else {
                        names = item.category;
                    }
                }
            }

            return "Published Menu - " + names;
        }

        return "No published menu!";
    },

    _renderCityTax() {
        if (this.state.currentCity) {
            return this.state.currentCity + " City Tax " + this.state.cityTaxes[this.state.currentCity] + "%";
        }
        return "City Tax is not set up!";
    },

    _renderSpecialOffer() {
        if (this.state.todaySpecialOffer) {
            let msg;
            if (this.state.specialOffer.discount > 0) {
                msg = "Apply " + numeral(this.state.specialOffer.discount).format('0.00%') + " discount automatically.";
            }
            if (this.state.specialOffer.notes) {
                if (msg) {
                    msg += "\r" + this.state.specialOffer.notes;
                } else {
                    msg = this.state.specialOffer.notes;
                }
            }
            return msg;
        } else {
            return "No Special Offers for today";
        }
    },

    _renderOOO() {
        if (this.state.hasOOO) {
            let ooo;
            for (let key in this.state.oooItems) {
                if (ooo) {
                    ooo += ", " + key;
                } else {
                    ooo = key;
                }
            }
            return "Out of Orders - " + ooo;
        } else {
            return "No Out of Order Items"
        }
    },

    _renderAnnouncement() {
        if (this.state.announcement) {
            return this.state.announcement.msg;
        } else {
            return "No Announcement";
        }
    },

    _handleTransferTaxPage() {
        if (this.state.cityTaxes && Object.keys(this.state.cityTaxes).length > 1) {
            this.setState({selectCityModal: "Yes"});
        } else {
            this._gotoManagementPage('tax');
        }
    },

    _gotoPayPalLogin(){
        this.props.navigator.push({
            title: 'PayPalLogin',
            name: 'PayPalLogin',
            component: PayPalLogin,
        });
    },

    _gotoManagementPage(page) {
        this.props.navigator.push({
            title: 'Management',
            name: 'Management',
            component: Management,
            passProps: {
                landingPage: page,
                profile: this.state.profile,
                announcement: this.state.announcement,
                specialOffer: this.state.specialOffer,
                oooItems: this.state.oooItems
            }
        });
    },

    _onSetRegion(region) {
        this.setState({
            marker: {
                latitude: region.latitude,
                longitude: region.longitude
            },
            currentRegion: region,
            viewMapModal: false
        }, () => Connector.send({topic: 'MyLocation'}));
    },

    _loadOrdersFromDB() {
        const readyStatus = `status = "${Realm.OrderStatus.Ready}"`;
        const openStatus = `status = "${Realm.OrderStatus.Open}"`;
        const closedStatus = `status = "${Realm.OrderStatus.Closed}"`;
        const canceledStatus = `status = "${Realm.OrderStatus.Canceled}"`;
        const pendingStatus = `status = "${Realm.OrderStatus.Pending}"`;
        this._allOrders = Realm.loadOrders(`timestamp >= $0 || ${readyStatus} || ${openStatus}`,
            this.props.businessTimestamp ? parseFloat(this.props.businessTimestamp) : 0);

        // Ready Orders - Ready
        this._readyOrders = this._allOrders.filtered(readyStatus);

        // Open Orders - Open
        this._openOrders = this._allOrders.filtered(openStatus);

        // Closed Orders - Closed
        this._closedOrders = this._allOrders.filtered(closedStatus);

        // Canceled Orders
        this._canceledOrders = this._allOrders.filtered(canceledStatus);

        this._pendingOrders = this._allOrders.filtered(pendingStatus);
    },

    _loadPublishedMenuFromDB() {
        const publishedMenusFromDB = Realm.loadPublishedMenu();
        if (publishedMenusFromDB.length > 0) {
            return {
                menuVersion: publishedMenusFromDB[0].menuVersionId,
                menus: JSON.parse(publishedMenusFromDB[0].menu).menu
            };
        }

        return null;
    }
});

var styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#3B709F",
    },
    row: {
        flexDirection: 'row',
    },
    rowWrap: {
        flexWrap: 'wrap',
    },
    column: {
        flexDirection: 'column',
    },
    flex1: {
        flex: 1,
    },
    text: {
        marginRight: 5,
        marginLeft: 5,
    },
    map: {
        flexDirection: 'column',
        margin: 10,
        marginBottom: 5,
        backgroundColor: '#ECECEC',
    },
    panel: {
        //backgroundColor: '#5194B9',
        backgroundColor: '#9ABFCC',
        //backgroundColor: '#FBBA3A',
        margin: 5,
        padding: 5,
        paddingBottom: 10,
    },
    section: {
        flex: 1,
        margin: 10,
        marginBottom: 5,
        padding: 20,
        paddingLeft: 10,
        paddingRight: 10,
        flexDirection: "row",
        backgroundColor: '#ECECEC',
        alignItems: 'center',
    },
    top: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    topRight: {
        flex: 2,
        height: 90,
        marginRight: 10,
        backgroundColor: '#ECECEC',
    },
    topLeft: {
        flex: 8,
    },
    opened: {
        backgroundColor: "#B5CD93",
        //backgroundColor: "#06A9AC",
    },
    closed: {
        //backgroundColor: "#DD928A",
        backgroundColor: "#EC9172",
    },
    unknown: {
        backgroundColor: "#ECECEC",
    },
    topArea: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginLeft: 10,
        marginRight: 10,
    },
    btn: {
        //flex: 1,
        margin: 5,
        marginBottom: 2.5,
        backgroundColor: '#ECECEC',
        justifyContent: 'center',
        height: 40,
        width: 200,
    },
    btnLabel: {
        fontSize: 18,
        color: '#313F51',
        textAlign: 'center',
    },
    tile: {
        marginLeft: 10,
        marginRight: 5,
        marginTop: 10,
        flex: 1,
        //width: 230,
        backgroundColor: '#ECECEC',
        borderRadius: 10,
    },
    tileLabel: {
        marginTop: 10,
        marginLeft: 20,
    },
    tileImage: {
        flex: 1,
        //alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageIcon: {
        //margin: 20,
        width: 70,
        height: 70,
    },
    rowModal: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 20,
    },
    border: {
        borderTopWidth: 1,
        borderTopColor: '#A9B1B9',
    },
    rowModalCity: {
        flex: 6,
    },
    rowModalTax: {
        flex: 4,
    },
    bottomArea: {
        margin: 10,
        padding: 5,
        backgroundColor: '#ECECEC',
    },
    marginRight5: {
        marginRight: 5,
    },
});

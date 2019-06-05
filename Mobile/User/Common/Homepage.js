'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Alert,
    BackAndroid,
    NativeAppEventEmitter,
    NativeModules,
    Platform,
    StyleSheet,
    View,
    TouchableHighlight,
    Modal
} from 'react-native';

import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Postal from 'postal';
import MapView from 'react-native-maps';
import * as Animatable from 'react-native-animatable';
import * as Progress from 'react-native-progress';
import Button from 'shared-modules/Button';
import IconNames from 'shared-modules/IconNames';

import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import TSAds from './TSAds';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';
import TSFilter from './TSFilter';

import Ordering from './Ordering';
import OpenOrders from './OpenOrders';
import CrossSell from './CrossSell';

import BusyIndicator from 'shared-modules/BusyIndicator';
import BusyIndicatorLoader from 'shared-modules/BusyIndicatorLoader';
import GeoLocation from 'shared-modules/GeoLocation';
import Connector from './Connector';
import OrderStore from './OrderStore';
import TruckInfoStore from './TruckInfoStore';
import OrderHistory from './OrderHistory';
import OrderNotification from './OrderNotification';
import Conversations from './Conversations';

const GoogleCloudMessaging = NativeModules.GoogleCloudMessaging;

const LATITUDE_DELTA = 0.009890099039267852;
const LONGITUDE_DELTA = 0.008883477675837526;
//var GREEN_COLOR = "#B5CD93";
const RED_COLOR = "#F96121";
const GREEN_COLOR = "#23CF5F";
//var CROSSSELL_COLOR = "#3B709F";
const CROSSSELL_COLOR = "#F96121";

const TruckCalloutView = React.createClass({

    getInitialState() {
        return {
            categories: {
                "US": "American", "CN": "Chinese", "IN": "Indian", "IT": "Italian",
                "JP": "Japanese", "KR": "Korean", "MT": "Mediterranean", "MX": "Mexican",
                "TH": "Thai", "VN": "Vietnamese"
            }
        }
    },

    render() {

        var category = this.state.categories[this.props.marker.category];

        var dollarShow = <FontAwesome name='dollar'
                                      size={15}
                                      color='#5A5B5D'
                                      style={styles.imageIcon}/>;


        var dollarFade = <FontAwesome name='dollar'
                                      size={15}
                                      color='#DEE1E5'
                                      style={styles.imageIcon}/>;

        var priceRange, dollarFld;

        if (this.props.marker.priceRange == "01") {
            priceRange = true;
            dollarFld = <View style={styles.row}>
                {dollarShow}
                {dollarFade}
                {dollarFade}
            </View>;
        } else if (this.props.marker.priceRange == "02") {
            priceRange = true;
            dollarFld = <View style={styles.row}>
                {dollarShow}
                {dollarShow}
                {dollarFade}
            </View>;
        } else if (this.props.marker.priceRange == "03") {
            priceRange = true;
            dollarFld = <View style={styles.row}>
                {dollarShow}
                {dollarShow}
                {dollarShow}
            </View>;
        }

        let specialOfferView = this.props.marker.specialOffer ?
            <Animatable.View ref="specialOffer" animation={"wobble"} duration={10000} delay={100}>
                <TSText fontNormal={true} fontSize="15" color="#F96121">Special Offer</TSText>
            </Animatable.View> : null;

        return (
            <TouchableHighlight underlayColor="#A9B1B9" onPress={this.props.onPress}>
                <View>
                    <View style={styles.row}>
                        <TSText>{this.props.marker.name}</TSText>
                        {this.props.marker.MyFavirote &&
                        <Ionicons name="ios-heart" size={20} color='#5A5B5D' style={styles.icon}/>}
                        {this.props.marker.MyMustTryList &&
                        <Ionicons name="ios-lightbulb" size={20} color='#5A5B5D' style={styles.icon}/>}
                    </View>
                    {this.props.marker.phone &&
                    <TSText fontNormal={true} fontSize="15">{this.props.marker.phone}</TSText>}
                    <View style={styles.row}>
                        {category &&
                        <TSText fontNormal={true} fontSize="15">{category}  </TSText>}
                        {priceRange && dollarFld}
                    </View>
                    {this.props.marker.pending >= 0 &&
                    <TSText fontNormal={true} fontSize="15">Pending Orders {this.props.marker.pending}</TSText>}
                    {specialOfferView}
                </View>
            </TouchableHighlight>
        )
    }
});

class OpenOrderCalloutView extends Component {
    static propTypes = {
        marker: PropTypes.object.isRequired,
        openOrder: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
    }

    render() {
        return (
            <TouchableHighlight underlayColor="#A9B1B9" onPress={this.props.onPress}>
                <View>
                    <View style={styles.row}>
                        <TSText>{this.props.marker.name}</TSText>
                        {this.props.marker.MyFavirote &&
                        <Ionicons name="ios-heart" size={20} color='#5A5B5D' style={styles.icon}/>}
                        {this.props.marker.MyMustTryList &&
                        <iIonicons name="ios-lightbulb" size={20} color='#5A5B5D' style={styles.icon}/>}
                    </View>
                    <TSText fontNormal={true} fontSize="15">Order #{this.props.openOrder.orderNum}</TSText>
                    <TSText fontNormal={true} fontSize="15"
                            color={GREEN_COLOR}>{this.props.openOrder.status}</TSText>
                </View>
            </TouchableHighlight>
        )
    }
}

let _backListener;
let _tokenRefreshedListener;

export default React.createClass({

    getInitialState() {
        this._subs = [Postal.channel("external").subscribe("UnreadSummary", this._onUnreadSummary),
            Postal.channel("internal").subscribe("OrderCanceled", this._onOrderCanceled),
            Postal.channel("internal").subscribe("OrderClosed", this._onOrderClosed),
            Postal.channel("external").subscribe("Authorized", this._onAuthorized),
            Postal.channel("external").subscribe("OperatorMenu",
                (operatorMenu) => {
                    BusyIndicatorLoader.hide();
                    if (operatorMenu.menu) {
                        let menu = JSON.parse(operatorMenu.menu).menu;

                        this.props.navigator.push({
                            title: 'Ordering',
                            name: 'Ordering',
                            component: Ordering,
                            passProps: {
                                truck: this.state.truckMarkers[operatorMenu.operatorId],
                                menuVersionId: operatorMenu.version,
                                menus: menu,
                                unmount: this._resetOpenOrders
                            }
                        });
                    }
                }),
            Postal.channel("internal").subscribe("OrderStatus", () => this._resetOpenOrders()),
            Postal.channel("internal").subscribe("GeoLocation",
                (position) => {
                    this.setState({
                        currentRegion: {
                            ...position,
                            latitudeDelta: LATITUDE_DELTA,
                            longitudeDelta: LONGITUDE_DELTA
                        }
                    }, () => {
                        if (!this._searchedOnLoad) {
                            this.searchingFoodTrucks(this.state.currentRegion);
                        }
                    })
                }),
            Postal.channel("external").subscribe("FoundFoodTrucks",
                (trucks) => {
                    this.setState({
                        truckMarkers: trucks.foodTrucks.reduce((markers, truck) => {
                            markers[truck.operatorId] = truck;
                            return markers;
                        }, {})
                    });
                })];

        if (!_tokenRefreshedListener) {
            _tokenRefreshedListener = NativeAppEventEmitter.addListener('TokenRefreshed', this._onTokenRefreshed);
        }

        let position = GeoLocation.whereAmI();
        let initRegion = position ? {
                ...position,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA
            } : null;

        this._searchedOnLoad = false;
        return {
            myLocation: initRegion,
            currentRegion: initRegion,
            filter: {
                name: null,
                favorite: false,
                tryout: false,
                hasSpecialOffer: false,
                categories: []
            },
            openModal: false,
            openTrucks: {},
            truckMarkers: {},
            order: null,
            counter: {marker: 0},
            conversations: []
        }
    },

    componentWillReceiveProps(nextProps) {
        this._resetOpenOrders();
    },

    componentWillMount() {
        if (Platform.OS === "android" && !_backListener) {
            _backListener = BackAndroid.addEventListener("hardwareBackPress", () => {
                this.props.navigator.popToTop();
                return true;
            })
        }
    },

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    },

    handleOnRegionChangeComplete(region) {
        this.setState({currentRegion: region});
    },

    searchingFoodTrucks(region) {
        if (region) {
            this._searchedOnLoad = true;
            Connector.send({
                topic: 'SearchingFoodTrucks',
                latitude: region.latitude,
                longitude: region.longitude,
                latDelta: region.latitudeDelta,
                longDelta: region.longitudeDelta
            });
        }
    },

    // Transfer to Truck Order page
    handleTruckCalloutPress(marker, markerRefs) {
        BusyIndicatorLoader.show("loading ...");
        //markerRefs.forEach(ref => ref.hideCallout());
        const sent = Connector.send({
            topic: "OperatorMenu",
            operatorId: marker.operatorId
        });
        if (!sent) {
            BusyIndicatorLoader.hide();
        }
    },

    handleOrderCalloutPress(marker, markerRefs, order) {
        //markerRefs.forEach(ref => ref.hideCallout());
        const trucks = {};
        trucks[marker.operatorId] = marker;
        this.props.navigator.push({
            title: 'OpenOrders',
            name: 'OpenOrders',
            component: OpenOrders,
            passProps: {
                trucks: trucks,
                openOrders: [order]
            }
        });
    },

    handleCrossSell() {
        this.props.navigator.push({
            title: 'CrossSell',
            name: 'CrossSell',
            component: CrossSell,
        });
    },

    _hasFilter() {
        const filter = this.state.filter;

        return filter.name || filter.favorite || filter.tryout || filter.hasSpecialOffer ||
            filter.categories.length > 0;
    },

    handleFilterCancel() {
        this.setState({openModal: false});
    },

    handleFilterApply(filter) {
        const region = this.state.currentRegion;
        Connector.send({
            topic: 'SearchingFoodTrucks',
            latitude: region.latitude,
            longitude: region.longitude,
            latDelta: region.latitudeDelta,
            longDelta: region.longitudeDelta,
            filter: filter
        });
        this.setState({openModal: false, filter: filter});
    },

    render() {
        const markerRefs = [];
        const openMarkers = Object.keys(this.state.truckMarkers)
            .map(key => this.state.truckMarkers[key])
            .filter(marker => this.state.openTrucks.hasOwnProperty(marker.operatorId))
            .map((marker, index) =>
                <MapView.Marker ref={ref => markerRefs.push(ref)} key={index} pinColor={GREEN_COLOR}
                                coordinate={marker.location}>
                    {this._renderMarkerCallout(marker, markerRefs)}
                </MapView.Marker>
            );

        const markers = Object.keys(this.state.truckMarkers)
            .map(key => this.state.truckMarkers[key])
            .filter(marker => !this.state.openTrucks.hasOwnProperty(marker.operatorId))
            .map((marker, index) =>
                <MapView.Marker ref={ref => markerRefs.push(ref)} key={index} coordinate={marker.location}>
                    {this._renderMarkerCallout(marker, markerRefs)}
                </MapView.Marker>
            );

        let filterColor = "#FFFFFF";
        if (this._hasFilter()) {
            filterColor = GREEN_COLOR; // green
        }

        let buttons = [{
            buttonPosition: "R",
            buttonIcon: IconNames.search,
            iconColor: filterColor,
            onPress: () => this.setState({openModal: true})
        }, {
            buttonPosition: "R",
            buttonIcon: IconNames.listBox,
            onPress: this._gotoOrderHistory
        }];
        if (Platform.OS === 'ios') {
            buttons.push({
                buttonPosition: "L",
                buttonIcon: IconNames.locate,
                onPress: () => this._refreshMyLocation_search()
            })
        }

        const openOrderIds = OrderStore.openOrderIds();
        if (openOrderIds.length > 0) {
            buttons.push({
                buttonPosition: "R",
                buttonIcon: IconNames.notifications,
                iconColor: GREEN_COLOR,
                onPress: () => this._gotoOpenOrders(this._getOpenOrdersAndTruckInfo(openOrderIds))
            });
        }

        // show chatbox when there is new unread chat coming
        buttons.push({
            buttonPosition: "L",
            buttonIcon: "ios-chatboxes",
            iconColor: this._sumUnread() > 0 ? GREEN_COLOR : "#ffffff",
            onPress: () => {
                this.props.navigator.push({
                    title: 'Conversations',
                    name: 'Conversations',
                    component: Conversations,
                    passProps: {
                        conversations: this.state.conversations
                    }
                });
            }
        });

        return (
            <View style={styles.container}>
                <TSHeader headerTitle='Kakee'
                          buttons={buttons}
                          hideConnection={true}/>
                <MapView style={styles.flex1}
                         onLayout={this._onMapViewLayout}
                         region={this.state.currentRegion}
                         showsUserLocation={true}
                         showsPointsOfInterest={false}
                         onRegionChangeComplete={this.handleOnRegionChangeComplete}>
                    {openMarkers}
                    {markers}
                </MapView>
                {this.state.currentRegion && this.state.searchBtn}
                <Button onPress={this.handleCrossSell}>
                    <View style={[styles.row, styles.margin]}>
                        <TSText fontNormal={true} color={CROSSSELL_COLOR}>Tap</TSText>
                        <Ionicons name={IconNames.refresh} size={25} color={CROSSSELL_COLOR}/>
                        <TSText fontNormal={true} color={CROSSSELL_COLOR}>to update map. Still don't see truck?</TSText>
                        <View style={styles.flex1}/>
                        <Ionicons name="ios-arrow-forward" size={25} color={CROSSSELL_COLOR}/>
                    </View>
                </Button>
                <TSAds style={styles.bannerArea}/>
                <Modal animationType={'none'} visible={this.state.openModal} transparent={true}
                       onRequestClose={this.handleFilterCancel}>
                    <View style={styles.modalContainer}>
                        <TSFilter filter={this.state.filter} onCancel={this.handleFilterCancel}
                                  onApply={this.handleFilterApply}/>
                    </View>
                </Modal>
                <OrderNotification onReceivedOpenOrders={this._onReceivedOpenOrders}/>
                <BusyIndicator/>
            </View>
        );
    },

    _refreshMyLocation_search() {
        let position = GeoLocation.whereAmI();
        let region = position ? {
                ...position,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA
            } : null;
        this.setState({currentRegion: region});
        this.searchingFoodTrucks(this.state.currentRegion);
    },

    _gotoOrderHistory() {
        this.props.navigator.push({
            title: 'OrderHistory',
            name: 'OrderHistory',
            component: OrderHistory,
            passProps: {}
        });
    },

    _onUnreadSummary(summaries) {
        // unread: [ { id: '', unread: 0, name: null } ]
        this.setState({conversations: summaries.unread});
    },

    _sumUnread() {
        if (this.state.conversations) {
            return this.state.conversations.reduce((sum, cvs) => sum + cvs.unread, 0);
        }
        return 0;
    },

    _onAuthorized() {
        const routeStack = this.props.navigator.getCurrentRoutes();
        if (routeStack[routeStack.length - 1].name === "Homepage") {
            GoogleCloudMessaging.fetchToken().then(this._onTokenRefreshed);
            Connector.send({topic: 'UnreadSummary'});
            if (Object.keys(this.state.truckMarkers).length === 0) {
                this.searchingFoodTrucks(this.state.currentRegion);
            }
        }
    },

    _onTokenRefreshed(token) {
        if (token) {
            Connector.send({
                topic: 'GcmToken',
                token: token,
                platform: Platform.OS
            });
        }
    },

    _renderMarkerCallout(marker, markerRefs) {
        const openOrder = this.state.openTrucks[marker.operatorId];
        if (Platform.OS === 'ios') {
            return openOrder ? (
                    <MapView.Callout>
                        <OpenOrderCalloutView marker={marker} openOrder={openOrder}
                                              onPress={this.handleOrderCalloutPress.bind(this, marker, markerRefs, openOrder)}/>
                    </MapView.Callout>
                ) : (
                    <MapView.Callout>
                        <TruckCalloutView marker={marker}
                                          onPress={this.handleTruckCalloutPress.bind(this, marker, markerRefs)}/>
                    </MapView.Callout>
                );
        }
        return openOrder ? (
                <MapView.Callout onPress={this._handleAndroidCallout(marker, markerRefs)}>
                    <OpenOrderCalloutView marker={marker} openOrder={openOrder}/>
                </MapView.Callout>
            ) : (
                <MapView.Callout onPress={this._handleAndroidCallout(marker, markerRefs)}>
                    <TruckCalloutView marker={marker}/>
                </MapView.Callout>
            );
    },

    _handleAndroidCallout(marker, markerRefs) {
        const openOrder = this.state.openTrucks[marker.operatorId];
        return () => (openOrder ? this.handleOrderCalloutPress : this.handleTruckCalloutPress)
        (marker, markerRefs, openOrder);
    },

    _resetOpenOrders(callback) {
        const openTrucks = OrderStore.openOrderIds()
            .reduce((trucks, orderId) => {
                const openOrder = OrderStore.getOpenOrder(orderId);
                if (openOrder) {
                    trucks[openOrder.operatorId] = openOrder;
                }
                return trucks;
            }, {});
        this.setState({openTrucks: openTrucks}, callback);
    },

    _onReceivedOpenOrders() {
        this._resetOpenOrders(() => {
            GoogleCloudMessaging.fetchNotifications()
                .then(notifications => {
                    if (notifications.length > 0) {
                        const openOrders = this._getOpenOrdersAndTruckInfo(notifications.map(msg => msg.orderId));
                        if (openOrders.orders.length > 0) {
                            // at this point, we get notification and open orders and truck info
                            this._gotoOpenOrders(openOrders);
                        } else {
                            this._gotoOrderHistory();
                        }
                    }
                });
        });
    },

    _getOpenOrdersAndTruckInfo(openOrderIds) {
        return openOrderIds
            .map(orderId => OrderStore.getOpenOrder(orderId))
            .filter(order => order)
            .reduce((reduced, order) => {
                const truckInfo = TruckInfoStore.getTruckInfo(order.operatorId);
                if (truckInfo) {
                    reduced.orders.push(order);
                    if (!reduced.trucks.hasOwnProperty(order.operatorId)) {
                        reduced.trucks[order.operatorId] = truckInfo;
                    }
                }
                return reduced;
            }, {'orders': [], 'trucks': {}});
    },

    _gotoOpenOrders(openOrders) {
        this.props.navigator.push({
            title: 'OpenOrders',
            name: 'OpenOrders',
            component: OpenOrders,
            passProps: {
                trucks: openOrders.trucks,
                openOrders: openOrders.orders
            }
        })
    },

    _renderSearchButton(layout) {
        if (layout) {
            const width = this.state.searchBtnWidth ? this.state.searchBtnWidth : 150;
            const left = (layout.width - width) / 2;
            return <View style={[styles.searchBtn, {top: layout.y + 10, left: left}]}>
                <Button onPress={() => this.searchingFoodTrucks(this.state.currentRegion)}>
                    <View style={[styles.row]} onLayout={this._onSearchBtnLayou}>
                        <TSText fontNormal={true}>Search this area </TSText>
                        <Ionicons name={IconNames.refresh} size={20}/>
                    </View>
                </Button>
            </View>;
        }
    },

    _onMapViewLayout(e) {
        this.setState({searchBtn: this._renderSearchButton(e.nativeEvent.layout)});
    },

    _onSearchBtnLayou(e) {
        const layout = e.nativeEvent.layout;
        if (layout) {
            this.setState({searchBtnWidth: layout.width});
        }
    },

    _onOrderCanceled(e) {
        if (e.order && e.truck) {
            BusyIndicatorLoader.hide();
            Alert.alert(`${e.truck.name}'s order #${e.order.orderNum} has been canceled`,
                `Please call ${e.truck.phone} if you have questions`,
                [{
                    text: 'OK', onPress: () => this.props.navigator.popToTop()
                }]);
        }
        this._resetOpenOrders();
    },

    _onOrderClosed(e) {
        if (e.order && e.truck) {
            BusyIndicatorLoader.hide();
            Alert.alert(`${e.truck.name}'s order #${e.order.orderNum} is closed`, undefined,
                [{
                    text: 'OK', onPress: () => this.props.navigator.popToTop()
                }]);
        }
        this._resetOpenOrders();
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
    flex1: {
        flex: 1,
    },
    alignCenter: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannerArea: {
        height: 50,
    },
    imageIcon: {
        width: 10,
        height: 15,
    },
    modalContainer: {
        flex: 1,
        //backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backgroundColor: '#FFFFFF',
    },
    searchBtn: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
    },
    icon: {
        alignSelf: 'center',
        width: 20,
        height: 20,
        margin: 2,
    },
    margin: {
        margin: 3,
        marginRight: 5,
    }
});
'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Alert,
    Animated,
    Dimensions,
    NativeModules,
    StyleSheet,
    TouchableHighlight,
    View,
} from 'react-native';

import Postal from 'postal';
import Ionicons from 'react-native-vector-icons/Ionicons';

import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import TSTextInput from 'shared-modules/TSTextInput';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import Env from 'shared-modules/Env';
import IconNames from 'shared-modules/IconNames';

const Printer = NativeModules.Printers;

import Realm from '../../Common/Realm/RealmSingleton';
import Connector from '../../Common/Connector';
import Carousel from '../../Common/Carousel';
import OrderPage from './OrderPage';
import Button from 'shared-modules/Button';

import OrdersListView from './OrdersListView';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

class OrderModal extends Component {
    static propTypes = {
        navigator: PropTypes.object,
        cityTax: PropTypes.object,
        specialOffer: PropTypes.object,
        profile: PropTypes.object,
        publishedMenus: PropTypes.object,
        onOrderCreated: PropTypes.func,
        onChange: PropTypes.func,
        onPrint: PropTypes.func,
    };

    constructor(props) {
        super(props);
        this.state = {
            showPage: false,
            offset: new Animated.Value(screenHeight)
        }
    }

    show(order) {
        if (order) {
            // display order details
            this.refs.orderPage.showOrder(order, this._showWindow.bind(this));
        } else {
            this.refs.orderPage.reset(this._showWindow.bind(this));
        }
    }

    hide() {
        Realm.cleanFailedCreditCardOrders();
        this.refs.orderPage.reset();
        Animated.spring(this.state.offset, {
            toValue: screenHeight
        }).start();
    }

    render() {
        return (
            <Animated.View style={[styles.modalBackground, {transform: [{translateY: this.state.offset}]}]}>
                <View style={styles.modal}>
                    <View style={[styles.modalMargin, styles.flex1]}>
                        <OrderPage ref="orderPage" {...this.props} />
                    </View>
                    <Button onPress={this.hide.bind(this)}
                            containerStyle={{
                                top: -8,
                                left: -8,
                                position: 'absolute',
                                backgroundColor: 'rgba(0,0,0,0)',
                            }}>
                        <Ionicons name="md-close-circle" color="#3B709F" size={40}/>
                    </Button>
                </View>
            </Animated.View>
        );
    }

    _showWindow() {
        Animated.spring(this.state.offset, {
            toValue: 0
        }).start();
    }
}

export default class extends Component {
    static propTypes = {
        allOrders: PropTypes.object,
        readyOrders: PropTypes.object,
        openOrders: PropTypes.object,
        closedOrders: PropTypes.object
    };

    constructor(props) {
        super(props);
        this.state = {
            headerTitle: "Open Orders",
            searchOrders: {},
            orderNumSearch: null,
            carouselSize: {width: screenWidth, height: screenHeight},
        };
        this._subs = [Postal.channel("internal").subscribe("RefreshOrder", this._refresh.bind(this)),
            Postal.channel("internal").subscribe("OrderChanged", this._refresh.bind(this))];
    }

    componentWillUnmount() {
        Realm.cleanOrderTTL(Date.now() - (24 * 60 * 60 * 1000));
        this._subs.forEach(sub => sub.unsubscribe());
    }

    onOrderCreated(order) {
        this._refresh();
    }

    handleOrderNumberChanged(text) {
        this.setState({orderNumSearch: text});
    }

    handleOrderNumberSearch(text) {
        var searchResults = [];
        var allOrders = this.props.allOrders;

        for (var i = 0; i < allOrders.length; i++) {
            if (allOrders[i].orderNum == text) {
                searchResults.push(allOrders[i]);
            }
        }

        this.setState({
            searchOrders: searchResults,
        });
    }

    _showOrder(order) { // drill into order
        this.refs.orderModal.show(order);
    }

    _onLayoutDidChange(e) {
        let layout = e.nativeEvent.layout;
        this.setState({carouselSize: {width: layout.width, height: layout.height}});
    }

    _onCarouselPageChange(activePage) {

        let title;
        switch (activePage) {
            case 0:
                title = "Open Orders";
                break;
            case 1:
                title = "Ready Orders";
                break;
            case 2:
                title = "Closed Orders";
                break;
            case 3:
                title = "Canceled Orders";
                break;
            case 4:
                title = "Pending Orders";
                break;
        }
        this.setState({headerTitle: title});
    }

    render() {
        let buttons = [{
            buttonPosition: "L",
            buttonIcon: IconNames.restaurant,
            buttonText: "New Order",
            onPress: () => this.refs.orderModal.show()
        },
            {
                buttonPosition: "R",
                buttonIcon: IconNames.home,
                onPress: () => {
                    this.props.navigator.pop(); // home
                }
            }];

        let {readyOrders, openOrders, closedOrders, canceledOrders, pendingOrders} = this.props;
        let headerTitle, num;
        switch (this.state.headerTitle) {
            case "Open Orders":
                num = openOrders.length ? openOrders.length : 0;
                break;
            case "Ready Orders":
                num = readyOrders.length ? readyOrders.length : 0;
                break;
            case "Closed Orders":
                num = closedOrders.length ? closedOrders.length : 0;
                break;
            case "Canceled Orders":
                num = canceledOrders.length ? canceledOrders.length : 0;
                break;
            case "Pending Orders":
                num = pendingOrders.length ? pendingOrders.length : 0;
                break;
        }
        headerTitle = this.state.headerTitle + " (" + num + ")";

        return (
            <View style={styles.container}>
                <TSHeader headerTitle={headerTitle}
                          buttons={buttons}
                          search="Order #"
                          onSearch={this.handleOrderNumberSearch.bind(this)}
                />
                <View style={styles.container} onLayout={this._onLayoutDidChange.bind(this)}>
                    <Carousel animate={false} style={this.state.carouselSize} indicatorSpace={80}
                              indicatorSize={10}
                              indicatorOffset={10}
                              onPageChange={this._onCarouselPageChange.bind(this)}>
                        <View style={[this.state.carouselSize, styles.carouselPadding]}
                              label={Realm.OrderStatus.Open}
                              badge={openOrders.length ? openOrders.length.toString() : '0'}>
                            <OrdersListView orders={openOrders} onChange={this._onChange.bind(this)}
                                            onPrint={this._printOrder.bind(this)}
                                            onShowOrder={this._showOrder.bind(this)}/>
                        </View>
                        <View style={[this.state.carouselSize, styles.carouselPadding]}
                              label={Realm.OrderStatus.Ready}
                              badge={readyOrders.length ? readyOrders.length.toString() : '0'}>
                            <OrdersListView orders={readyOrders} onChange={this._onChange.bind(this)}
                                            onPrint={this._printOrder.bind(this)}
                                            onShowOrder={this._showOrder.bind(this)}/>
                        </View>
                        <View style={[this.state.carouselSize, styles.carouselPadding]}
                              label={Realm.OrderStatus.Closed}
                              badge={closedOrders.length ? closedOrders.length.toString() : '0'}>
                            <OrdersListView orders={closedOrders} onChange={this._onChange.bind(this)}
                                            onPrint={this._printOrder.bind(this)}
                                            onShowOrder={this._showOrder.bind(this)}/>
                        </View>
                        <View style={[this.state.carouselSize, styles.carouselPadding]}
                              label={Realm.OrderStatus.Canceled}
                              badge={canceledOrders.length ? canceledOrders.length.toString() : '0'}>
                            <OrdersListView orders={canceledOrders} onChange={this._onChange.bind(this)}
                                            onPrint={this._printOrder.bind(this)}
                                            onShowOrder={this._showOrder.bind(this)}/>
                        </View>
                        <View style={[this.state.carouselSize, styles.carouselPadding]}
                              label={Realm.OrderStatus.Pending}
                              badge={pendingOrders.length ? pendingOrders.length.toString() : '0'}>
                            <OrdersListView orders={pendingOrders} onChange={this._onChange.bind(this)}
                                            onPrint={this._printOrder.bind(this)}
                                            onShowOrder={this._showOrder.bind(this)}/>
                        </View>
                    </Carousel>
                    <OrderModal ref="orderModal" navigator={this.props.navigator}
                                cityTax={this.props.cityTax}
                                specialOffer={this.props.specialOffer}
                                publishedMenus={this.props.publishedMenus}
                                profile={this.props.profile}
                                onOrderCreated={this.onOrderCreated.bind(this)}
                                onChange={this._onChange.bind(this)}
                                onPrint={this._printOrder.bind(this)}
                    />
                </View>
            </View>
        );
    }

    _refresh() {
        this.setState({refresh: true});
        Connector.send({
            topic: 'PendingOrders',
            pending: this.props.openOrders.length
        });
    }

    _printOrder(order) {
        if (!Env.isPrinterConnected) {
            Alert.alert("No Printer", "Printer is not connected.");
            return;
        }

        //{
        //  headers: ["header1", "header2"],
        //  body:    [ {left: "left", middle: "middle", right: "right"},
        //             {},  empty line
        //             {} ],
        //  footers: ["footer1", "footer2"]
        //}
        let printing = {headers: [], body: [], footers: []};

        printing.headers.push("order #" + order.orderNum);
        if (order.menuItems) {
            JSON.parse(order.menuItems).items.forEach(item => {
                printing.body.push({
                    left: item.quantity ? numeral(item.quantity).format('0,0') : '',
                    middle: item.name ? item.name : '',
                    right: item.price ? '$' + item.price : ''
                });

                if (item.subItems) {
                    item.subItems.forEach(subItem => {
                        printing.body.push({
                            left: '',
                            middle: subItem.name,
                            right: subItem.price ? '$' + subItem.price : ''
                        });
                    });
                }
            });
        }

        if (order.notes) {
            printing.body.push({});
            printing.body.push({middle: order.notes});
            printing.body.push({});
        }

        printing.footers.push('subTotal ' + numeral(order.subTotal).format('$0.00'));
        printing.footers.push('discount ' + numeral(order.discount).format('$0.00'));
        printing.footers.push('tax(' + numeral(order.taxRate).format('0.00%') + ') ' +
            numeral(order.tax).format('$0.00'));
        printing.footers.push('total ' + numeral(order.total).format('$0.00'));

        Printer.print(printing)
            .then(() => console.log("ok"))
            .catch(e => console.log(e))
    }

    _onChange(order, status) {
        Realm.updateOrderStatus({orderId: order.orderId, status: status})
            .then(() => this._refresh());
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
    noOrder: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    leftPanel1: {
        flex: 2,
        margin: 4,
    },
    rightPanel1: {
        flex: 8,
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
    main: {
        padding: 5
    },
    carouselPadding: {
        padding: 5,
    },
    flexCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modal: {
        backgroundColor: '#FFFFFF',
        position: 'absolute',
        top: 5,
        right: 100,
        bottom: 60,
        left: 100,
    },
    modalMargin: {
        margin: 10,
    },
    modalBackground: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
});
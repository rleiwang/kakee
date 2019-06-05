'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Platform,
    Picker,
    StyleSheet,
    View,
    ScrollView,
    Alert,
    Image
} from 'react-native';

import numeral from 'numeral';
import Postal from 'postal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';

import IconNames from 'shared-modules/IconNames';
import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import TSLongTextInput from 'shared-modules/TSLongTextInput';
import TSModal from 'shared-modules/TSModal';
import TSAds from './TSAds';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';
import Comments from './Comments';
import OrderStatus from './OrderStatus';
import OrderCreation from './OrderCreation';
import Connector from './Connector';

import BusyIndicatorLoader from 'shared-modules/BusyIndicatorLoader';
import Button from 'shared-modules/Button';
import Menu from 'shared-modules/Menu';
import Receipt from 'shared-modules/Receipt';
import TSTrainStop from "./TSTrainStop";
import PickupTime from './PickupTime';

const PAGE = {MENU: 0, RECEIPT: 1, ORDER_STATUS: 2};
const stopDone = "#3B709F";
const stopCurr = "#FBBA3A";
const stopNotYet = "#999999";

const pickUpTimes = [0, 15, 30];

export default class extends Component {
    static propTypes = {
        truck: PropTypes.object,
        menuVersionId: PropTypes.string,
        menus: PropTypes.array,
        openOrder: PropTypes.object
    };

    constructor(props) {
        super(props);
        this._subs = [Postal.channel("external").subscribe("UnreadSummary", this._onUnreadSummary.bind(this))];
        this.state = {
            tryout: props.truck.tryout,
            favorite: props.truck.favorite,
            saveWarning: false,
            orderedItems: [],
            showPage: this.props.openOrder ? PAGE.ORDER_STATUS : PAGE.MENU,
            order: this.props.openOrder ? this.props.openOrder : {items: []},
            noteModal: false,
            pickupTime: 0,
        };
    }

    handleComments() {
        if (this.state.unread) {
            this.state.unread.unread = 0;
        }
        this.setState({unread: undefined}, () => {
            this.props.navigator.push({
                title: 'Comments',
                name: 'Comments',
                component: Comments,
                passProps: {
                    truck: this.props.truck
                }
            });
        });
    }

    handleMustTry() {
        this.setState({tryout: !this.state.tryout}, () => {
            Connector.send({
                topic: 'PreferenceAction',
                type: 'TRYOUT',
                operatorId: this.props.truck.operatorId,
                add: this.state.tryout
            });
        });
    }

    handleFavorite() {
        this.setState({favorite: !this.state.favorite}, () => {
            Connector.send({
                topic: 'PreferenceAction',
                type: 'FAVORITE',
                operatorId: this.props.truck.operatorId,
                add: this.state.favorite
            });
        });
    }

    getDiscount(truck) {
        if (truck.specialOffer) {
            let currentTime = Date.now();
            if (currentTime >= truck.specialOffer.startDate && currentTime <= truck.specialOffer.endDate) {
                if (truck.specialOffer.discount) {
                    return -1 * truck.specialOffer.discount;
                }
            }
        }
        return 0;
    }

    onMenuSelected(order) {
        this.setState({order: Object.assign(this.state.order, order)});
    }

    _flipFlop(state) {
        this.refs.card.flipOutY(50).then(() => this.setState(state, () => {
            this.refs.card.flipInY(50)
        }));
    }

    showMenu() {
        this._flipFlop({showPage: PAGE.MENU});
    }

    reviewOrder() {
        if (this.state.order && this.state.order.subTotal && this.state.order.subTotal > 0) {
            let {truck} = this.props;
            let order = {...this.state.order};
            order.operatorId = truck.operatorId;
            order.foodTruckName = truck.name;
            order.foodTruckPromoCode = truck.promoCode;
            order.menuVersion = this.props.menuVersionId;
            order.refCode = Date.now().toString();
            order.city = truck.city;

            this._flipFlop({showPage: PAGE.RECEIPT, order: order});
        } else {
            Alert.alert("Nothing is Selected", "Select menu items you want to order before go to next step.");
        }
    }

    placeOrder() {
        BusyIndicatorLoader.show("Sending ...");
        let order = {...this.state.order};
        order.pickupTime = this.state.pickupTime > 0 ? (Date.now() + this.state.pickupTime * 60 * 1000) : 0;
        this.setState({order: order}, () => this.refs.orderCreation.placeOrder());
    }

    onOrderUpdate(order) {
        BusyIndicatorLoader.hide();
        if (order.status === 'Received') {
            Alert.alert("Your order number #" + order.orderNum,
                "You are the " + numeral(order.pending).format('0o') + " in the queue.");
        }
        this.setState({
            order: order,
            showPage: PAGE.ORDER_STATUS
        });
    }

    onOrderRejected(order, isOffline) {
        BusyIndicatorLoader.hide();
        Alert.alert(
            isOffline ? "Operator closed taking mobile orders" :
            "There is a problem placing your order",
            "",
            [
                {text: 'Back', onPress: () => this.props.navigator.pop()},
                {text: 'Retry', onPress: () => this.placeOrder()}
            ]
        );
    }

    onNotes(text) {
        let order = {...this.state.order};
        order.notes = text;

        this.setState({order: order});
    }

    renderOrderMenuContent(rightButton) {
        switch (this.state.showPage) {
            case PAGE.ORDER_STATUS:
                return (
                    <OrderStatus order={this.state.order} truck={this.props.truck} navigator={this.props.navigator}/>
                );
            case PAGE.RECEIPT:
                return (
                    <Receipt order={this.state.order}>
                        <View style={styles.marginTop}>
                            {!this.state.order.orderId && this._renderPickUpTime()}
                            {!this.state.order.orderId &&
                            <TSButtonSecondary label="Special Notes" buttonIconRight="ios-create-outline"
                                               onPress={() => this.setState({noteModal: true})}/>}
                            <TSText fontNormal={true} color="#FF0000">{this.state.order.notes}</TSText>
                        </View>
                        <View style={[styles.row, styles.alignCenter]}>
                            <View style={styles.flex1}/>
                            <Button onPress={this.placeOrder.bind(this)}>
                                <TSText fontNormal={true} color="#3B709F">{rightButton.buttonTextRight}</TSText>
                                <Ionicons name={rightButton.buttonIcon} size={30} color='#3B709F'/>
                            </Button>
                        </View>
                        <TSModal visible={this.state.noteModal} width={300} height={400}
                                 onRequestClose={this._onRequestClose.bind(this)}>
                            <View style={styles.modal}>
                                <TSLongTextInput placeholder="Special Notes"
                                                 value={this.state.order.notes}
                                                 onChangeText={this.onNotes.bind(this)}/>
                            </View>
                            <Button onPress={() => this.setState({noteModal: false})}
                                    containerStyle={styles.closeButton}>
                                <Ionicons name="md-checkmark-circle" color="#3B709F" size={40}/>
                            </Button>
                        </TSModal>
                    </Receipt>
                );
        }

        return (
            <Menu menus={this.props.menus} onMenuSelected={this.onMenuSelected.bind(this)}
                  taxRate={this.props.truck.taxRate} discountPct={this.getDiscount(this.props.truck)}>
                <View style={[styles.row, styles.alignCenter]}>
                    <View style={styles.flex1}/>
                </View>
            </Menu>
        );
    }

    componentWillMount() {
        Connector.send({topic: 'UnreadSummary'})
    }

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    }

    render() {
        var buttons = [{
            "buttonPosition": "R",
            "buttonIcon": IconNames.home,
            onPress: () => {
                if (this.state.saveWarning) {
                    Alert.alert(
                        "The order is not placed, do you want to continue?",
                        'Tap Yes to continue without saving.  Tap No to stay on the page.',
                        [
                            {text: 'Yes', onPress: () => this.props.navigator.popToTop()},
                            {text: 'No'},
                        ]
                    );
                } else {
                    this.props.navigator.popToTop();
                }
            }
        }];

        let rightButton = {
            "buttonPosition": "R",
        };

        switch (this.state.showPage) {
            case PAGE.MENU:
                rightButton.buttonIcon = IconNames.arrowForward;
                rightButton.buttonTextRight = "Review";
                rightButton.onPress = this.reviewOrder.bind(this);
                //buttons.push(rightButton);
                break;
            case PAGE.RECEIPT:
                rightButton.buttonIcon = IconNames.send;
                rightButton.buttonTextRight = "Send Order";
                rightButton.onPress = this.placeOrder.bind(this);
                //buttons.push(rightButton);
                break;
        }

        let favoriteIcon = this.state.favorite ? "ios-heart" : "ios-heart-outline";
        let mustTryIcon = this.state.tryout ? "ios-bulb" : "ios-bulb-outline";
        let chatIcon = this.state.unread && this.state.unread.unread > 0 ? "ios-chatboxes" : "ios-chatboxes-outline";
        let truck = this.props.truck;

        return (
            <View style={styles.container}>
                <TSHeader headerTitle={truck.name} buttons={buttons} hideConnection={true}/>
                <View style={styles.content}>
                    <View style={[styles.row, styles.rowSeparatorBottom]}>
                        {truck.photo ? <Image source={{uri: `data:image/jpg;base64,${truck.photo}`}}
                                              style={styles.logoImg}/>
                            : <View style={styles.logoImgHolder}><Ionicons name={IconNames.image} size={50}
                                                                           color='#5A5B5D'/></View>}
                        <View style={styles.logoHeader}>
                            <View style={styles.column}>
                                <View style={[styles.row, styles.justifySpaceAround]}>
                                    <View style={[styles.column, styles.marginRight5]}>
                                        <TSText fontNormal={true}>{truck.phone}</TSText>
                                        {this.state.showPage !== PAGE.ORDER_STATUS &&
                                        <TSText fontSize="12" fontNormal={true}>
                                            Pending Orders {truck.pending}
                                        </TSText>}
                                    </View>
                                    <Button onPress={this.handleComments.bind(this)}>
                                        <View style={styles.stackButton}>
                                            <Ionicons name={chatIcon} size={20} color='#5194B9'/>
                                            <TSText fontNormal={true} fontSize="10">Chat</TSText>
                                        </View>
                                    </Button>
                                    <Button onPress={this.handleMustTry.bind(this)}>
                                        <View style={styles.stackButton}>
                                            <Ionicons name={mustTryIcon} size={20} color='#5194B9'/>
                                            <TSText fontNormal={true} fontSize="10">Must Try</TSText>
                                        </View>
                                    </Button>
                                    <Button onPress={this.handleFavorite.bind(this)}>
                                        <View style={styles.stackButton}>
                                            <Ionicons name={favoriteIcon} size={20} color='#5194B9'/>
                                            <TSText fontNormal={true} fontSize="10">Favorite</TSText>
                                        </View>
                                    </Button>
                                </View>
                                <View style={styles.marginBottom10}/>
                                {this.state.weeklySchedule &&
                                <TSButtonSecondary buttonIconLeft="truck" iconLeftSource="Ionicons"
                                                   label="Weekly Schedule"
                                                   labelSize="12" iconSize="30"/>}
                                {truck.specialOffer &&
                                <TSText fontNormal={true} color="#F96121">
                                    {numeral(truck.specialOffer.discount).format('0.[00]%') + " off entire order"}
                                </TSText>}
                                {truck.announcement &&
                                <TSText fontNormal={true} color="#F96121">{truck.announcement}</TSText>}
                            </View>
                        </View>
                    </View>
                    {this.state.showPage !== PAGE.ORDER_STATUS &&
                    <View style={[styles.row, styles.marginLeft5, styles.marginRight5, styles.marginBottom10]}>
                        <View style={styles.flex1}>
                            {this._renderPrevButton()}
                        </View>
                        <View style={[styles.flex3, {alignItems: 'center'}]}>
                            <TSTrainStop trainStop={this._renderTrainStopContent()}/>
                        </View>
                        <View style={styles.flex1}>
                            {this._renderNextButton()}
                        </View>
                    </View>}
                    <ScrollView ref="content">
                        <Animatable.View ref="card">{this.renderOrderMenuContent(rightButton)}</Animatable.View>
                    </ScrollView>
                </View>
                <TSAds style={styles.bannerArea}/>
                <OrderCreation ref="orderCreation" order={this.state.order} truck={truck}
                               onOrderUpdate={this.onOrderUpdate.bind(this)}
                               onOrderRejected={this.onOrderRejected.bind(this)}/>
                {Platform.OS === 'ios' &&
                <PickupTime ref="pickupTimeModal" pickupTimes={pickUpTimes} pickupTime={this.state.pickupTime}
                            onSelected={this._onPickUpTimeSelected.bind(this)}/>}
            </View>
        );
    }

    _onRequestClose() {

    }

    _renderTrainStopContent() {
        switch (this.state.showPage) {
            case PAGE.MENU:
                //return [stopDone, stopDone, stopCurr];
                return "F"; /* first stop */
            case PAGE.RECEIPT:
                //return [stopDone, stopCurr, stopNotYet];
                return "L"; /* last stop */
        }

        //return [stopCurr, stopNotYet, stopNotYet];
        return "";
    }

    _renderPrevButton() {
        switch (this.state.showPage) {
            case PAGE.RECEIPT:
                return <Button onPress={this.showMenu.bind(this)}>
                    <View style={styles.margin5}>
                        <Ionicons name='ios-arrow-dropleft' size={30} color='#3B709F'/>
                        <View style={styles.marginRight5}/>
                    </View>
                </Button>;
        }
        return null;
    }

    _renderNextButton() {
        switch (this.state.showPage) {
            case PAGE.MENU:
                return <Button onPress={this.reviewOrder.bind(this)}>
                    <View style={styles.flex1}/>
                    <View style={styles.marginRight5}/>
                    <View style={styles.margin5}>
                        <Ionicons name='ios-arrow-dropright' size={30} color='#3B709F'/>
                    </View>
                </Button>;
        }
        return null;
    }

    _onUnreadSummary(summaries) {
        // unread: [ { id: '', unread: 0, name: null } ]
        const unread = summaries.unread.find(item => item.id === this.props.truck.operatorId);
        if (unread && unread.unread > 0) {
            this.setState({unread: unread});
        }
    }

    _renderPickUpTime() {
        const pickup = 'Pickup after ';
        return Platform.OS === 'ios' ?
            <TSButtonSecondary onPress={() => this.refs.pickupTimeModal.show()}
                               label={pickup + (this.state.pickupTime === 0 ? 'ready' : `${this.state.pickupTime} minutes`)}/>
            :
            <Picker selectedValue={this.state.pickupTime} mode='dropdown'
                    onValueChange={this._onPickUpTimeSelected.bind(this)}>
                {pickUpTimes.map((time, idx) =>
                    <Picker.Item key={idx} value={time} label={pickup + (time === 0 ? 'ready' : `${time} minutes`)}/>
                )}
            </Picker>;
    }

    _onPickUpTimeSelected(time) {
        this.setState({pickupTime: time});
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        //flexDirection: 'row',
        padding: 5,
    },
    logoImgHolder: {
        width: 100,
        height: 100,
        borderWidth: 1,
        borderColor: '#A9B1B9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoImg: {
        width: 100,
        height: 100,
    },
    logoHeader: {
        flex: 1,
        marginLeft: 5,
    },
    row: {
        flexDirection: 'row',
        //alignItems: 'center',
    },
    justifySpaceAround: {
        flex: 1,
        justifyContent: 'space-around',
    },
    alignCenter: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    stackButton: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    column: {
        flexDirection: 'column',
    },
    marginBottom10: {
        marginBottom: 10,
    },
    marginRight5: {
        marginRight: 5,
    },
    marginLeft5: {
        marginLeft: 5,
    },
    marginTop: {
        marginTop: 20,
    },
    margin5: {
        marginRight: 5,
        marginLeft: 5,
    },
    flex1: {
        flex: 1,
    },
    flex2: {
        flex: 2,
    },
    flex3: {
        flex: 3,
    },
    flex4: {
        flex: 4,
    },
    flex6: {
        flex: 6,
    },
    rowSeparatorBottom: {
        borderBottomWidth: 1,
        borderBottomColor: "#A9B1B9",
        marginBottom: 5,
        paddingBottom: 5,
    },
    bannerArea: {
        height: 50,
    },
    icon: {
        alignSelf: 'center',
        width: 15,
        height: 15,
        margin: 2,
    },
    modal: {
        margin: 20,
    },
    closeButton: {
        top: -8,
        left: -8,
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0)'
    },
});
'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    StyleSheet,
    View,
    ScrollView,
    Image
} from 'react-native';

import Postal from 'postal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Carousel from 'react-native-carousel';

import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import Button from 'shared-modules/Button';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';

import Comments from './Comments';
import OrderStatus from './OrderStatus';
import OrderStore from './OrderStore';
import TruckInfoStore from './TruckInfoStore';
import Connector from './Connector';
import TSAds from './TSAds';
import IconNames from 'shared-modules/IconNames';

class OrderPage extends Component {
    static propTypes = {
        order: PropTypes.object.isRequired,
        truck: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
        this._subs = [Postal.channel("internal").subscribe("OrderStatus", this._onOrderStatus.bind(this)),
            Postal.channel("external").subscribe("UnreadSummary", this._onUnreadSummary.bind(this))];

        this.state = {
            tryout: props.truck.tryout,
            favorite: props.truck.favorite,
            order: props.order
        };
    }

    componentWillMount() {
        Connector.send({topic: 'UnreadSummary'})
    }

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    }

    render() {
        const favoriteIcon = this.state.favorite ? "ios-heart" : "ios-heart-outline";
        const mustTryIcon = this.state.tryout ? "ios-bulb" : "ios-bulb-outline";
        const chatIcon = this.state.unread && this.state.unread.unread > 0 ? "ios-chatboxes" : "ios-chatboxes-outline";
        const {truck} = this.props;
        const {order} = this.state;

        return (
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={[styles.row, styles.rowSeparatorBottom]}>
                        {truck.photo ? <Image source={{uri: `data:image/jpg;base64,${truck.photo}`}}
                                              style={styles.logoImg}/>
                            : <View style={styles.logoImgHolder}><Ionicons name={IconNames.image} size={50}
                                                                           color='#5A5B5D'/></View>}
                        <View style={styles.logoHeader}>
                            <View style={styles.column}>
                                <View style={[styles.row, styles.justifySpaceAround]}>
                                    {/*<View style={[styles.column, styles.marginRight5]}>
                                     <TSText fontNormal={true}>{truck.phone}</TSText>
                                     </View>*/}
                                    <TSText fontNormal={true}>{truck.phone}</TSText>
                                    <Button onPress={this.handleComments.bind(this)}>
                                        <View style={styles.stackButton}>
                                            <Ionicons name={chatIcon} size={20} color='#5194B9'/>
                                            <TSText fontNormal={true} fontSize="10">Chat</TSText>
                                        </View>
                                    </Button>
                                    <Button onPress={this.handleTryOut.bind(this)}>
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
                </View>
                <ScrollView ref="content">
                    <OrderStatus order={order} truck={truck} navigator={this.props.navigator}/>
                </ScrollView>
            </View>
        );
    }

    handleComments() {
        if (this.state.unread) {
            this.state.unread.unread = 0;
        }
        this.setState({unread: undefined},
            () => this.props.navigator.push({
                title: 'Comments',
                name: 'Comments',
                component: Comments,
                passProps: {
                    truck: this.props.truck
                }
            }));
    }

    handleTryOut() {
        this.setState({tryout: !this.state.tryout},
            () => Connector.send({
                topic: 'PreferenceAction',
                type: 'TRYOUT',
                operatorId: this.props.truck.operatorId,
                add: this.state.tryout
            }));
    }

    handleFavorite() {
        this.setState({favorite: !this.state.favorite},
            () => Connector.send({
                topic: 'PreferenceAction',
                type: 'FAVORITE',
                operatorId: this.props.truck.operatorId,
                add: this.state.favorite
            }));
    }

    _onOrderStatus(order) {
        if (order.orderId === this.state.order.orderId) {
            this.setState({order: order});
        }
    }

    _onUnreadSummary(summaries) {
        // unread: [ { id: '', unread: 0, name: null } ]
        const unread = summaries.unread.find(item => item.id === this.props.truck.operatorId);
        if (unread && unread.unread > 0) {
            this.setState({unread: unread});
        }
    }
}

export default class extends Component {
    static propTypes = {
        openOrders: PropTypes.array.isRequired,
        trucks: PropTypes.object.isRequired,
        navigator: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            carouselSize: {}
        }
    }

    render() {
        const buttons = [{
            "buttonPosition": "R",
            "buttonIcon": IconNames.home,
            onPress: () => this.props.navigator.popToTop()
        }];

        return (
            <View style={styles.container}>
                <TSHeader headerTitle={"Open Orders"} buttons={buttons} hideConnection={true}/>
                <View style={styles.container} onLayout={this._onLayoutDidChange.bind(this)}>
                    <Carousel animate={false} indicatorOffset={55} style={this.state.carouselSize}>
                        {this._renderOpenOrders()}
                    </Carousel>
                </View>
            </View>
        );
    }

    _renderOpenOrders() {
        return this.props.openOrders.map((order, idx) =>
            <View key={idx} style={[this.state.carouselSize]}>
                <OrderPage order={order} truck={this.props.trucks[order.operatorId]}
                           navigator={this.props.navigator}/>
                <TSAds style={styles.bannerArea}/>
            </View>
        );
    }

    _onLayoutDidChange(e) {
        let layout = e.nativeEvent.layout;
        this.setState({carouselSize: {width: layout.width, height: layout.height}});
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        //flex: 1,
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
    marginTop: {
        marginTop: 20,
    },
    flex1: {
        flex: 1,
    },
    flex2: {
        flex: 2,
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

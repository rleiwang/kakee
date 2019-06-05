'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import Postal from 'postal';

import Connector from './Connector';
import OrderStore from './OrderStore';
import TruckInfoStore from './TruckInfoStore';

export default class extends Component {
    static propTypes = {
        order: PropTypes.object,
        truck: PropTypes.object,
        onOrderUpdate: PropTypes.func,
        onOrderRejected: PropTypes.func
    };

    constructor(props) {
        super(props);
    }

    onOrderSent(ordStatus) {
        if (ordStatus.refCode === this.props.order.refCode) {
            this.props.order.orderId = ordStatus.orderId;
            OrderStore.newOrder(ordStatus.orderId, this.props.order);
            TruckInfoStore.saveTruckInfo(this.props.truck);
        }
    }

    onOrderFailure(ordStatus, isOffline) {
        if (ordStatus.orderId) {
            OrderStore.removeOrder(ordStatus.orderId);
            TruckInfoStore.removeTruckInfo(this.props.truck.operatorId);
        }
        if (this.props.onOrderRejected) {
            this.props.onOrderRejected(this.props.order, isOffline);
        }
    }

    // called from Order
    placeOrder() {
        let preOrder = {...this.props.order};
        delete preOrder.items;
        preOrder.menuItems = JSON.stringify({items: this.props.order.items});

        Connector.send({
            topic: "MobileOrder",
            dest: {
                id: preOrder.operatorId,
                channel: "operator"
            },
            refCode: preOrder.refCode,
            expiry: 18338,
            order: preOrder
        });
    }

    componentWillMount() {
        this.setState({
            ordSubs: [Postal.channel("internal").subscribe("Sent", this.onOrderSent.bind(this)),
                Postal.channel("internal").subscribe("OperatorOffline", this.onOrderFailure.bind(this, true)),
                Postal.channel("internal").subscribe("Rejected", this.onOrderFailure.bind(this)),
                Postal.channel("internal").subscribe("OrderStatus", this.props.onOrderUpdate)]
        });
    }

    componentWillUnmount() {
        this.state.ordSubs.forEach(sub => sub.unsubscribe());
    }

    render() {
        return null;
    }
}

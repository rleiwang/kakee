'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Vibration
} from 'react-native';

import Postal from 'postal';

import Connector from './Connector';
import OrderStore from './OrderStore';
import TruckInfoStore from './TruckInfoStore';

export default class extends Component {
    static propTypes = {
        onReceivedOpenOrders: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);
        this._subs = [Postal.channel("external").subscribe("OrderStatus", this.onOrderStatus.bind(this)),
            Postal.channel("external").subscribe("OrderPaid", this.onOrderPaid.bind(this)),
            Postal.channel("external").subscribe("PaypalPaid", this.onOrderPaid.bind(this)),
            Postal.channel("external").subscribe("OpenOrders", this.onOpenOrders.bind(this))];
    }

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    }

    render() {
        return null;
    }

    onOrderStatus(ordStatus) {
        let updates = {status: ordStatus.status};
        switch (ordStatus.status) {
            case 'Sent': // Server forwarded mobile order to operator
            case 'OperatorOffline': // Server unable to forward the order
            case 'Rejected': // operator rejected this order
                Postal.publish({
                    channel: "internal",
                    topic: ordStatus.status,
                    data: ordStatus
                });
                break;
            case 'Closed': // Closed - operator closed this order
            case 'Canceled': // Canceled - operator closed this order
                const openOrder = OrderStore.getOpenOrder(ordStatus.orderId);
                const truckInfo = TruckInfoStore.getTruckInfo(ordStatus.src.id);
                OrderStore.removeOrder(ordStatus.orderId);
                TruckInfoStore.removeTruckInfo(ordStatus.src.id);
                Postal.publish({
                    channel: "internal",
                    topic: `Order${ordStatus.status}`,
                    data: {
                        order: openOrder,
                        truck: truckInfo
                    }
                });
                break;
            case 'Received': // Operator received this order, mobile client needs to confirm it
                updates.orderNum = ordStatus.orderNum;
                try {
                    // reply confirmation
                    Connector.send({
                        topic: "OrderConfirmation",
                        dest: ordStatus.src,
                        orderId: ordStatus.orderId
                    });
                    this.updateOrder(ordStatus.orderId, updates, ordStatus.pending);
                } catch (e) {
                    console.log(e);
                    console.log("TODO: deal with err send confirmation")
                }
                break;
            case 'Ready':
                Vibration.vibrate(500, true);
            default:
                this.updateOrder(ordStatus.orderId, updates);
        }
    }

    onOrderPaid(paidOrder) {
        this.updateOrder(paidOrder.orderId, {payments: paidOrder.payments});
    }

    onOpenOrders(openOrders) {
        openOrders.trucks.forEach(truck => TruckInfoStore.saveTruckInfo(truck));
        openOrders.orders.forEach(order => OrderStore.newOrder(order.orderId, order));
        this.props.onReceivedOpenOrders();
    }

    updateOrder(orderId, updates, pending) {
        const order = OrderStore.updateOrderStatus(orderId, updates);
        this.onOrderUpdate(order, pending);
    }

    onOrderUpdate(order, pending) {
        Postal.publish({
            channel: "internal",
            topic: "OrderStatus",
            data: {...order, pending: pending}
        });
    }
}

'use strict';

class OrderStore {
    constructor() {
        this._openOrders = {};
    }

    newOrder(orderId, order) {
        this._openOrders[orderId] = order;
    }

    getOpenOrder(orderId) {
        return this._openOrders[orderId];
    }

    updateOrderStatus(orderId, updates) {
        let order = this._openOrders.hasOwnProperty(orderId) ? this._openOrders[orderId] : {};
        order = Object.assign(order, updates);
        this._openOrders[orderId] = order;
        return order;
    }

    removeOrder(orderId) {
        delete this._openOrders[orderId];
    }

    openOrderIds() {
        return Object.keys(this._openOrders);
    }
}

export default new OrderStore();

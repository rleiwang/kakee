'use strict'

class Order {
}

Order.schema = {
    name: 'Order',
    primaryKey: 'orderId',
    properties: {
        orderId: 'string',
        customerId: 'string',
        orderNum: {type: 'int', indexed: true}, // 1-100 recycle
        type: {type: 'string', default: 'OnSite'}, // type needs to match server side Order.Type
        city: 'string',
        status: {type: 'string', indexed: true, default: 'Placed'}, // Open, Ready, Canceled, Closed
        timestamp: 'double',
        notes: {type: 'string', optional: true, default: null},
        latitude: {type: 'float', optional: true, default: 0},
        longitude: {type: 'float', optional: true, default: 0},
        subTotal: 'float',
        taxRate: 'float',
        tax: 'float',
        total: 'float',
        promoCode: {type: 'string', optional: true, default: null},
        discount: {type: 'float', optional: true, default: 0},
        // JSON - {"payments": [{"method": "CC", "transId": "123", "paid": "2.35", "timestamp": "1234"},
        //        {"method": "CS", "paid": "4.35", "timestamp": "4567"}]}
        payments: {type: 'string', optional: true, default: null},
        menuVersion: 'string',
        // JSON - {"items": [{"name": "Buritto", "price": "7.00", "quantity": "2", "subItems": [{"name": "Chicken", "price": "1"}, {"name": "Bean"}]},
        //        {"name": "Coke", "price": "1.5", "quantity": "1"}]}
        menuItems: 'string',
        pickupTime: {type: 'int', optional: true, default: 0},
    }
};

module.exports = Order;




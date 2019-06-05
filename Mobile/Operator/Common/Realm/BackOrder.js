'use strict'

// Define out of order items.
// a list of out of order items is stored as json string that is keyed by versionId.
// every time there is change, a new row is inserted with current timestamp.
// The one with the latest versionId will be active one, and rest will be for logging audit purpose.
class BackOrder {
}

BackOrder.schema = {
    name: 'BackOrder',
    primaryKey: 'versionId',
    properties: {
        versionId: 'int',
        timestamp: 'double',
        localdttm: 'string',
        // JSON string
        // {"menuVersionId": "123", "oooItems": ["Main:Burrito:Beef", "Main:Taco"]}
        items: 'string'
    }
};


module.exports = BackOrder;

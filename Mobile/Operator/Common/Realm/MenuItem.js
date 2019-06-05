'use strict'

class MenuItem {
}

MenuItem.schema = {
    name: 'MenuItem',
    primaryKey: 'itemId',
    properties: {
        itemId: 'int',
        categoryId: 'int',
        seqNo: 'int',
        name: 'string',
        descr: {type: 'string', optional: true, default: null},
        price: {type: 'string', optional: true, default: null},
        group: {type: 'string', optional: true, default: null},
        minOrder: {type: 'string', optional: true, default: null},
        isParent: {type: 'bool', optional: true, default: false},
        subItems: {type: 'list', objectType: 'MenuItem', default: []}
    }
};

module.exports = MenuItem;
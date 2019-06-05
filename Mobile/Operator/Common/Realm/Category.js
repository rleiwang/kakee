'use strict'

class Category {
}

Category.schema = {
    name: 'Category',
    primaryKey: 'categoryId',
    properties: {
        categoryId: 'int',
        seqNo: 'int',
        name: 'string',
        modified: {type: 'bool', optional: true}
    }
};

module.exports = Category;

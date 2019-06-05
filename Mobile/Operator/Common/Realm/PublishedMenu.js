'use strict'

/*
 {"menu": [
 {"category": "main", "name": "Burrito", "descr": "Burrito Descr", "price": "7.5", "minOrder": "2",
 "subItems": [{"name": "Beef", "descr": "Beef Descr", "group": "A", "price": "1"},
 {"name": "Chicken", "descr": "Chicken Descr", "group": "A"},
 {"name": "Pork", "descr": "Pork Descr", "group": "A"},
 {"name": "Pinto Beans", "descr": "Pinto Beans Descr", "group": "B"},
 {"name": "Black Beans", "descr": "Black Benas Descr", "group": "B"},
 {"name": "Rice", "descr": "Rice Descr"}]},
 {"category": "main", "name": "Chicken Taco", "descr": "Chicken Taco Descr", "price": "8.50", "minOrder": "2"},
 {"category": "main", "name": "Fish Taco", "descr": "Fish Taco Descr", "price": "9.50", "minOrder": "2"},
 {"category": "drink", "name": "Coke", "descr": "Coke Descr", "price": "1.50"},
 {"category": "drink", "name": "Diet Coke", "descr": "Diet Coke Descr", "price": "1.65"},
 ]}
 */

class PublishedMenu {
}

PublishedMenu.schema = {
    name: 'PublishedMenu',
    primaryKey: 'menuVersionId',
    properties: {
        menuVersionId: 'string',
        menu: 'string'
    }
};

module.exports = PublishedMenu;
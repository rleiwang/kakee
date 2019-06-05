'use strict'

class Preferences {
}

Preferences.schema = {
    name: 'Preferences',
    primaryKey: 'key',
    properties: {
        key: 'string',
        value: 'string'
    }
};

module.exports = Preferences;

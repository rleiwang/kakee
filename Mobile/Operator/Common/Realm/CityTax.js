'use strict'

// city tax is effective dated with timestamp.
// a list of city tax is stored as json string that is keyed by city.
// every time there is change, a new row is inserted with current timestamp.
// The one with the latest versionId will be active one, and rest will be for logging audit purpose.
class CityTax {
}

CityTax.schema = {
    name: 'CityTax',
    primaryKey: 'versionId',
    properties: {
        versionId: 'int',
        timestamp: 'double',
        localdttm: {type: 'string', optional: true},
        cityTax: 'string' // JSON string - {"San Jose": "8.55", "San Francisco": "9.55"}
    }
};

module.exports = CityTax;
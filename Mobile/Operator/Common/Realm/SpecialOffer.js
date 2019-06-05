'use strict'

// every time there is change, a new row is inserted with current timestamp.
// The one with the latest versionId will be active one, and rest will be for audit purpose.
class SpecialOffer {
}

SpecialOffer.schema = {
    name: 'SpecialOffer',
    primaryKey: 'version',
    properties: {
        version: 'string',
        deleted: {type: 'bool', optional: true, default: false},
        startDate: 'date',
        endDate: 'date',
        discount: 'float',
        promoCode: {type: 'string', optional: true, default: null},
        notes: {type: 'string', optional: true, default: null}
    }
};

module.exports = SpecialOffer;

'use strict'

class BusinessHour {
}

BusinessHour.schema = {
    name: 'BusinessHour',
    primaryKey: 'seqId',
    properties: {
        seqId: 'int',
        timestamp: 'double',
        localdttm: {type: 'string', optional: true},
        status: 'string',
        taxCityKey: 'string'
    }
};

module.exports = BusinessHour;

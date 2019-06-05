'use strict'

// every time there is change, a new row is inserted with current timestamp.
// The one with the latest versionId will be active one, and rest will be for audit purpose.
class Profile {
}

Profile.schema = {
    name: 'Profile',
    primaryKey: 'version',
    properties: {
        version: 'string',
        timestamp: 'double',
        name: 'string',
        category: 'string',
        priceRange: 'string',
        phone: 'string',
        email: 'string',
        ccp: 'string',
        localdttm: {type: 'string', optional: true, default: null},
        descr: {type: 'string', optional: true, default: null},
        primaryCity: {type: 'string', optional: true, default: null},
        photo: {type: 'string', optional: true, default: null},
        paypal: {type: 'string', optional: true, default: null},
        sq_api: {type: 'string', optional: true, default: null},
        sq_token: {type: 'string', optional: true, default: null},
        website: {type: 'string', optional: true, default: null},
        twitter: {type: 'string', optional: true, default: null},
        facebook: {type: 'string', optional: true, default: null}
    }
};

module.exports = Profile;
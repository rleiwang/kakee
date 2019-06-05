'use strict';

class LastRegion {
}

LastRegion.schema = {
    name: 'LastRegion',
    primaryKey: 'lid',
    properties: {
        lid: 'int',
        latitude: 'float',
        longitude: 'float',
        latitudeDelta: 'float',
        longitudeDelta: 'float'
    }
};

export default LastRegion;

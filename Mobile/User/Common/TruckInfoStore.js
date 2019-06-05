'use strict';

import {
    AsyncStorage
} from 'react-native';

import Postal from 'postal';

class TruckInfoStore {
    constructor() {
        this._trucks = {};
    }

    saveTruckInfo(truckInfo) {
        this._trucks[truckInfo.operatorId] = truckInfo;
    }

    getTruckInfo(operatorId) {
        return this._trucks[operatorId];
    }

    removeTruckInfo(operatorId) {
        delete this._trucks[operatorId];
    }
}

export default new TruckInfoStore();

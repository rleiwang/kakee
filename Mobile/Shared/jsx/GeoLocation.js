'use strict';

import {
    AsyncStorage
} from 'react-native';

import Postal from 'postal';

const LATITUDE_DELTA = 0.008243894505248761;
const LONGITUDE_DELTA = 0.010471345283392;

const STORAGE_KEY = 'LAST_GPS';

class GeoLocation {
    constructor() {
        this._loadInitialState().done();
        let options = {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 30000
        };
        const onError = (err) => console.log(err);
        const onPosition = (pos) => {
            this.GPSLocation = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude
            };
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.GPSLocation));
            Postal.publish({
                channel: "internal",
                topic: "GeoLocation",
                data: this.GPSLocation
            });

            if (!this._watchID) {
                options.enableHighAccuracy = true;
                this._watchID = navigator.geolocation.watchPosition(onPosition, onError, options);
            }
        };
        navigator.geolocation.getCurrentPosition(onPosition, onError, options);
    }

    _loadInitialState = async() => {
        try {
            this.GPSLocation = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY));
        } catch (error) {
        }
    };

    initRealm(realm) {
        this._Realm = realm;
    }

    myGPSLocation() {
        return this.GPSLocation;
    }

    setRegion(region) {
        if (this._Realm) {
            this._Realm.saveLastRegion(region);
        }
    }

    whereAmI() {
        let lastRegion = this._Realm ? this._Realm.loadLastRegion() : null;
        if (lastRegion) {
            return lastRegion;
        }
        if (this.GPSLocation) {
            return {
                ...this.GPSLocation,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA
            };
        }
    }
}

export default new GeoLocation();

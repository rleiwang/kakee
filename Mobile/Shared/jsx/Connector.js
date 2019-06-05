'use strict';

import {
    NativeModules
} from 'react-native';

import Postal from 'postal';

import WebSocketConnect from './WebSocketConnector';
import DeviceInfo from './DeviceInfo';
import GeoLocation from './GeoLocation';
import Env from './Env';

const Utils = NativeModules.Utils;

export default class extends WebSocketConnect {
    constructor(channel) {
        Postal.channel("external").subscribe("Connected", () => {
            if (Env.token) {
                this.send({
                    topic: 'Authorization',
                    token: Env.token
                });
            }
        });
        Postal.channel("external").subscribe("Authorization", auth => {
            Env.token = auth.token;
            Env.isProd = auth.isProd;
        });
        Postal.channel("internal").subscribe("Connector",
            (connector) => {
                if (connector.type === 'Open') {
                    this._ws = connector.ws;
                    const deviceInfo = DeviceInfo.info();
                    Utils.encrypt(deviceInfo.uniqueID)
                        .then(cipherText => this.send({
                            topic: "MyLogin",
                            token: cipherText,
                            deviceInfo: deviceInfo
                        }))
                        .catch(e => console.log(e));
                }
            });
        Postal.channel("internal").subscribe("Logout", () => {
            Env.token = undefined;
            if (this._ws) {
                this._ws.close();
            }
        });
        super(GeoLocation, channel);
    }
}
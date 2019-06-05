'use strict';

import {
    AppState,
    NetInfo
} from 'react-native';

import Postal from 'postal';
import Timer from 'react-native-timer';

import DeviceInfo from './DeviceInfo';
import Env from './Env';

const _ws = new WeakMap();
const topic = 'Connector';
let _connecting = false;
let _retries = 0;
const MAX_RETRY = 200;
const INTERVAL = 100;

function _openWebSocket(connector) {
    if (_connecting) {
        return;
    }
    _connecting = true;
    const ws = new WebSocket(`${Env.webSocketAddr}/${connector.endpoint}`);
    ws.onopen = (e) => {
        // { type: "open" }
        _retries = 0;
        Timer.clearTimeout(connector);
        _ws.set(connector, ws);
        _connecting = false;
        Env.isConnected = true;
        Postal.publish({
            channel: "internal",
            topic: topic,
            data: {
                type: 'Open',
                event: e,
                ws: ws
            }
        });
    };

    ws.onmessage = (e) => {
        // { type: "message", data: "" }
        if (e.data === '') {
            return;
        }
        let msg = JSON.parse(e.data);
        if (msg && msg.topic) {
            Postal.publish({
                channel: "external",
                topic: msg.topic,
                data: msg
            });
        }
    };

    ws.onerror = (e) => {
        // { type: "error", message: "" }
        Postal.publish({
            channel: "internal",
            topic: topic,
            data: {
                type: 'Error',
                event: e
            }
        });
    };

    ws.onclose = (e) => {
        // { type: "close", code: "23", reason: "" }
        _ws.delete(connector);
        _connecting = false;
        Env.isConnected = false;
        Postal.publish({
            channel: "internal",
            topic: topic,
            data: {
                type: 'Close',
                event: e
            }
        });
        _checkConnection(connector);
    };
}

function _checkConnection(connector) {
    NetInfo.isConnected.fetch()
        .then(isConnected => {
            if (isConnected && !_ws.has(connector)) {
                Timer.clearTimeout(connector);
                if (++_retries < MAX_RETRY) {
                    Timer.setTimeout(connector, "reconnect", () => _openWebSocket(connector), INTERVAL);
                }
            }
        });
}

function _handleConnectionInfoChange(connector, connectionInfo) {
    _retries = 0;
    _checkConnection(connector);
}

function _handleAppStateChange(connector, appState) {
    if (appState === 'active') {
        _retries = 0;
        _checkConnection(connector);
    }
}

export default class {
    constructor(geo, endpoint) {
        this.geo = geo;
        this.endpoint = endpoint;

        const connector = this;
        Postal.channel("internal").subscribe("Reconnect", () => {
            if (_retries >= MAX_RETRY) {
                _retries = 0;
                _checkConnection(connector);
            }
        });
        NetInfo.addEventListener('change', info => _handleConnectionInfoChange(connector, info));
        AppState.addEventListener('change', appState => _handleAppStateChange(connector, appState));
        _openWebSocket(this);
    }

    send(msg) {
        let ws = _ws.get(this);
        if (ws) {
            let region = this.geo.whereAmI();
            msg.sequence = Date.now();
            msg.geoLocation = region ? {
                latitude: region.latitude,
                longitude: region.longitude
            } : {latitude: 0, longitude: 0};
            msg.installID = DeviceInfo.info().uniqueID;
            ws.send(JSON.stringify(msg));
            return true;
        }
        return false;
    }
}

'use strict';

const _uri = "s://ws.tristonetech.com:7443";

class ENV {

    set isProd(prod) {
        this._isProd = prod;
    }

    get isProd() {
        return this._isProd ? true : false;
    }

    set token(token) {
        this._token = token;
    }

    get token() {
        return this._token;
    }

    get webSocketAddr() {
        return `ws${_uri}`;
    }

    get webServiceAddr() {
        return `http${_uri}`;
    }

    set isConnected(connected) {
        this._connected = connected;
    }

    get isConnected() {
        return this._connected ? this._connected : false;
    }

    set isPrinterConnected(on) {
        this._printer = on;
    }

    get isPrinterConnected() {
        return this._printer ? this._printer : false;
    }
}

export default new ENV();

'use strict'

import {
    DeviceEventEmitter
} from 'react-native';

const loaderHandler = {
    hide () {
        DeviceEventEmitter.emit('changeLoadingEffect', {isVisible: false});
    },
    show (title) {
        DeviceEventEmitter.emit('changeLoadingEffect', {title: title, isVisible: true});
    }
};

module.exports = loaderHandler;

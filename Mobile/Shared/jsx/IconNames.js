'use strict';

import {
    Platform,
} from 'react-native';

class IconNames {

    get home() {
        return Platform.OS === 'ios' ? 'ios-home' : 'md-home';
    }

    get arrowForward() {
        return Platform.OS === 'ios' ? 'ios-arrow-forward' : 'md-arrow-forward';
    }

    get arrowBack() {
        return Platform.OS === 'ios' ? 'ios-arrow-back' : 'md-arrow-back';
    }

    get image() {
        return Platform.OS === 'ios' ? 'ios-image' : 'md-image';
    }

    get cloudUpload() {
        return Platform.OS === 'ios' ? 'ios-cloud-upload' : 'md-cloud-upload';
    }

    get chatboxes() {
        return Platform.OS === 'ios' ? 'ios-chatboxes' : 'md-chatboxes';
    }

    get checkmarkCircle() {
        return Platform.OS === 'ios' ? 'ios-checkmark-circle' : 'md-checkmark-circle';
    }

    get notifications() {
        return Platform.OS === 'ios' ? 'ios-notifications' : 'md-notifications';
    }

    get closeCircle() {
        return Platform.OS === 'ios' ? 'ios-close-circle' : 'md-close-circle';
    }

    get undo() {
        return Platform.OS === 'ios' ? 'ios-undo' : 'md-undo';
    }

    get print() {
        return Platform.OS === 'ios' ? 'ios-print' : 'md-print';
    }

    get cash() {
        return Platform.OS === 'ios' ? 'ios-cash' : 'md-cash';
    }

    get card() {
        return Platform.OS === 'ios' ? 'ios-card' : 'md-card';
    }

    get logOut() {
        return Platform.OS === 'ios' ? 'ios-log-out' : 'md-log-out';
    }

    get restaurant() {
        return Platform.OS === 'ios' ? 'ios-restaurant' : 'md-restaurant';
    }

    get pie() {
        return Platform.OS === 'ios' ? 'ios-pie' : 'md-pie';
    }

    get cog() {
        return Platform.OS === 'ios' ? 'ios-cog' : 'md-cog';
    }

    get radioButtonOn() {
        return Platform.OS === 'ios' ? 'ios-radio-button-on' : 'md-radio-button-on';
    }

    get radioButtonOff() {
        return Platform.OS === 'ios' ? 'ios-radio-button-off' : 'md-radio-button-off';
    }

    get addCircle() {
        return Platform.OS === 'ios' ? 'ios-add-circle' : 'md-add-circle';
    }

    get removeCircle() {
        return Platform.OS === 'ios' ? 'ios-remove-circle' : 'md-remove-circle';
    }

    get copy() {
        return Platform.OS === 'ios' ? 'ios-copy-outline' : 'md-copy';
    }

    get mail() {
        return Platform.OS === 'ios' ? 'ios-mail' : 'md-mail';
    }

    get search() {
        return Platform.OS === 'ios' ? 'ios-search' : 'md-search';
    }

    get listBox() {
        return Platform.OS === 'ios' ? 'ios-list-box' : 'md-list-box';
    }

    get locate() {
        return Platform.OS === 'ios' ? 'ios-locate' : 'md-locate';
    }

    get refresh() {
        return Platform.OS === 'ios' ? 'ios-refresh' : 'md-refresh';
    }

    get send() {
        return Platform.OS === 'ios' ? 'ios-send' : 'md-send';
    }
}

export default new IconNames();

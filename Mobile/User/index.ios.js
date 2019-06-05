'use strict';

import React from 'react';

import {
    AppRegistry,
    Navigator,
    PushNotificationIOS
} from 'react-native';

import Homepage from './Common/Homepage';

let User = React.createClass({
    _onRegister(deviceToken) {
        console.log("PushNotification Register");
        console.log(deviceToken);
    },

    componentWillMount() {
        PushNotificationIOS.addEventListener('register', this._onRegister);
    },

    componentWillUnmount() {
        PushNotificationIOS.removeEventListener('register', this._onRegister);
    },

    render: function () {
        return (
            <Navigator
                initialRoute={{name: 'Homepage', component: Homepage}}
                configureScene={() => {
                    return Navigator.SceneConfigs.FloatFromRight;
                }}
                renderScene={(route, navigator) => {
                    if (route.component) {
                        //var Component = route.component;
                        //return <Component navigator={navigator} route={route} {...route.passProps}/>
                        return React.createElement(route.component, Object.assign({}, {navigator}, route.passProps));
                    }
                }}
            />
        );
    }
});

AppRegistry.registerComponent('User', () => User);

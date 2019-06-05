'use strict';

import React from 'react';

import {
    AppRegistry,
    Navigator,
} from 'react-native';

import Login from './ios/App/Login';

const kakee = React.createClass({
    render: function () {
        return (
            <Navigator
                initialRoute={{name: 'Login', component: Login}}
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

AppRegistry.registerComponent('kakee', () => kakee);

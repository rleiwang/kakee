'use strict';

import React from 'react';

import {
    AppRegistry,
    Navigator
} from 'react-native';

import Homepage from './Common/Homepage';

const User = React.createClass({

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

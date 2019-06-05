'use strict';

import React from 'react';

import {
    StyleSheet,
    View,
    Text,
} from 'react-native';

module.exports = React.createClass({

    render() {

        return (
            <View style={[styles.badge, (this.props.children < 10 ||
                (this.props.children < 100 && this.props.children.indexOf("1") != -1))
                && styles.circle, (this.props.color && {backgroundColor: this.props.color})]}>
                <Text ref="text"
                      style={[styles.label, (this.props.small && styles.smallFont)]}>{this.props.children}</Text>
            </View>
        );
    }
});

var styles = StyleSheet.create({
    badge: {
        //flexDirection: 'row',
        //flex: 1,
        backgroundColor: '#5A5B5D',
        height: 30,
        //width: 30,
        borderRadius: 15,
        margin: 4,
        justifyContent: 'center',
    },
    circle: {
        width: 30,
    },
    label: {
        margin: 5,
        alignSelf: 'center',
        fontSize: 13,
        fontWeight: 'bold',
        color: '#ECECEC',
        textAlign: 'center',
    },
    smallFont: {
        fontSize: 10,
        fontWeight: 'normal',
    },
});
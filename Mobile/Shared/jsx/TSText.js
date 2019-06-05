'use strict';

import React from 'react';

import {
    StyleSheet,
    Text,
}  from 'react-native';

module.exports = React.createClass({

    render() {
        var colorStyle = function (color) {
            if (color) {
                return {
                    color: color,
                }
            } else {
                return {}
            }

        };

        var fontStyle = function (fontSize) {
            if (fontSize) {
                return {
                    fontSize: Number(fontSize),
                }
            } else {
                return {}
            }
        };

        return (
            <Text style={[styles.label,
                (this.props.number && styles.alignRight),
                (this.props.fontNormal && styles.fontNormal),
                colorStyle(this.props.color),
                this.props.fontSize && {fontSize: Number(this.props.fontSize)},
                this.props.style]} onPress={this.props.onPress}>
                {this.props.children}</Text>
        );
    }
});

var styles = StyleSheet.create({
    label: {
        marginRight: 2,
        marginLeft: 4,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#5A5B5D',
    },
    alignRight: {
        textAlign: 'right',
    },
    fontNormal: {
        fontWeight: 'normal',
    },
});

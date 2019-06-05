'use strict';

import React from 'react';

import {
    TouchableHighlight,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import Button from 'shared-modules/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

module.exports = React.createClass({

    render() {

        let iconLeftSource = "Ionicons"; // default source
        if (this.props.iconSource) {
            iconLeftSource = this.props.iconLeftSource;
        }

        let iconRightSource = "Ionicons"; // default source
        if (this.props.iconRightSource) {
            iconRightSource = this.props.iconRightSource;
        }

        return (
            <Button style={[this.props.large && styles.large]}
                                onPress={this.props.onPress}>
                <View style={styles.row}>
                    {this.props.buttonIconLeft && iconLeftSource == 'Ionicons' &&
                    <Ionicons
                        name={this.props.buttonIconLeft}
                        size={30}
                        color='#3B709F'/>}
                    {this.props.buttonIconLeft && iconLeftSource == 'FontAwesome' &&
                    <FontAwesome
                        name={this.props.buttonIconLeft}
                        size={30}
                        color='#3B709F'/>}
                    <Text style={[styles.text, this.props.buttonIconLeft && styles.marginLeft, this.props.buttonIconRight && styles.marginRight]}>{this.props.label}</Text>
                    {this.props.buttonIconRight && iconRightSource == 'Ionicons' &&
                    <Ionicons
                        name={this.props.buttonIconRight}
                        size={30}
                        color='#3B709F'/>}
                    {this.props.buttonIconRight && iconRightSource == 'FontAwesome' &&
                    <FontAwesome
                        name={this.props.buttonIconRight}
                        size={30}
                        color='#3B709F'/>}
                </View>
            </Button>
        );
    }
});

var styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        margin: 5,
        alignItems: 'center',
    },
    marginLeft: {
        marginLeft: 4,
    },
    marginRight: {
        marginRight: 4,
    },
    primaryButton: {
        padding: 4,
        margin: 2,
    },
    large: {
        height: 50,
        justifyContent: 'center',
    },
    text: {
        fontSize: 18,
        color: '#3B709F',
        textAlign: 'center',
    },
    icon: {
        margin: 2,
        width: 25,
        height: 25,
    }
});
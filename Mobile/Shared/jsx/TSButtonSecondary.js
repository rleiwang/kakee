'use strict';

import React from 'react';

import {
    TouchableHighlight,
    StyleSheet,
    View,
    Text,
} from 'react-native';

import Button from 'shared-modules/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

module.exports = React.createClass({

    render() {

        let iconLeftSource = "Ionicons"; // default source
        if (this.props.iconLeftSource) {
            iconLeftSource = this.props.iconLeftSource;
        }

        let iconRightSource = "Ionicons"; // default source
        if (this.props.iconRightSource) {
            iconRightSource = this.props.iconRightSource;
        }

        return (
            <Button onPress={this.props.onPress}>
                <View style={styles.row}>
                    {this.props.buttonIconLeft && iconLeftSource == 'Ionicons' &&
                    <Ionicons
                        name={this.props.buttonIconLeft}
                        size={18}
                        color='#5194B9'/>}
                    {this.props.buttonIconLeft && iconLeftSource == 'FontAwesome' &&
                    <FontAwesome
                        name={this.props.buttonIconLeft}
                        size={18}
                        color='#5194B9'/>}
                    <Text style={[styles.text, this.props.buttonIconLeft && styles.marginLeft, this.props.buttonIconRight && styles.marginRight]}>{this.props.label}</Text>
                    {this.props.stretch && <View style={styles.flex1}/>}
                    {this.props.buttonIconRight && iconRightSource == 'Ionicons' &&
                    <Ionicons
                        name={this.props.buttonIconRight}
                        size={18}
                        color='#5194B9'/>}
                    {this.props.buttonIconRight && iconRightSource == 'FontAwesome' &&
                    <FontAwesome
                        name={this.props.buttonIconRight}
                        size={18}
                        color='#5194B9'/>}
                </View>
            </Button>
        );
    }
});

var styles = StyleSheet.create({
    primaryButton: {
        padding: 4,
        margin: 2,
    },
    text: {
        fontSize: 18,
        //color: '#5A5B5D',
        color: '#5194B9',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 5,
    },
    icon: {
        alignSelf: 'center',
        width: 15,
        height: 15,
        margin: 2,
    },
    marginLeft: {
        marginLeft: 4,
    },
    marginRight: {
        marginRight: 4,
    },
    flex1: {
        flex: 1,
    }
});

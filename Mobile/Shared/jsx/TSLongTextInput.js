'use strict';

import React from 'react';

import {
    StyleSheet,
    View,
    Text,
    TextInput,
} from 'react-native';

var WithLabel = React.createClass({
    render: function () {
        return (
            <View style={styles.fieldContainer}>
                <Text style={styles.label}>{this.props.label}</Text>
                <TextInput style={styles.textInput}
                           keyboardType={this.props.keyboardType}
                           placeholder={this.props.placeholder}
                           multiline={true}
                           value={this.props.value}
                           onChangeText={this.props.onChangeText}/>
            </View>
        );
    },
});

var WithoutLabel = React.createClass({
    render: function () {
        return (
            <View style={styles.fieldContainer}>
                <TextInput style={[styles.textInput,
                this.props.subItem=='Y' && styles.subTextInput,
                (this.props.keyboardType == 'decimal-pad' || this.props.keyboardType == 'numeric') && styles.textAlignRight]}
                           keyboardType={this.props.keyboardType}
                           placeholder={this.props.placeholder}
                           multiline={true}
                           value={this.props.value}
                           onChangeText={this.props.onChangeText}/>
            </View>
        )
    }
});

module.exports = React.createClass({
    render() {
        var fieldRender;
        var keyboardType = this.props.keyboardType;
        if (keyboardType == null || keyboardType == '') {
            keyboardType = 'default';
        }

        if (this.props.label == null || this.props.label == '') {
            fieldRender = <WithoutLabel subItem={this.props.subItem}
                                        keyboardType={keyboardType}
                                        placeholder={this.props.placeholder}
                                        value={this.props.value}
                                        onChangeText={this.props.onChangeText}/>;
        } else {
            fieldRender = <WithLabel label={this.props.label}
                                     keyboardType={keyboardType}
                                     placeholder={this.props.placholder}
                                     value={this.props.value}
                                     onChangeText={this.props.onChangeText}/>;
        }

        return (
            <View>{fieldRender}</View>
        );
    }
});

var styles = StyleSheet.create({
    fieldContainer: {
        flexDirection: 'column',
    },
    label: {
        marginTop: 5,
        marginLeft: 4,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#5A5B5D',
        textAlign: 'left',
    },
    textInput: {
        flex: 1,
        color: '#5A5B5D',
        height: 100,
        borderWidth: 1,
        borderColor: '#A9B1B9',
        fontSize: 18,
        padding: 4,
        margin: 2,
    },
    textAlignRight: {
        textAlign: 'right',
    },
    subTextInput: {
        color: '#8A7D88',
    },
});
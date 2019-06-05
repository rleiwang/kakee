'use strict';

import React from 'react';

import {
    StyleSheet,
    View,
    Text,
    TextInput
} from 'react-native';

var WithLabel = React.createClass({
    render: function () {

        //console.log(this.props);

        return (
            <View style={styles.row}>
                <View style={!this.props.inline && styles.labelContainer}>
                    {this.props.extra}
                    <Text style={[styles.label, this.props.color && {color: this.props.color}, this.props.inline && {fontWeight: 'normal', marginRight: 0}]}>{this.props.label}</Text>
                </View>
                <View style={this.props.inline ? styles.flex1 : styles.textContainer}>
                    <View style={styles.row}>
                        <TextInput style={[styles.textInput, this.props.color && {color: this.props.color}]}
                                   keyboardType={this.props.keyboardType}
                                   placeholder={this.props.placeholder}
                                   editable={this.props.hasOwnProperty("editable") ? this.props.editable : true}
                                   value={this.props.value}
                                   secureTextEntry={this.props.secureTextEntry}
                                   autoFocus={this.props.autoFocus}
                                   autoCapitalize="none"
                                   autoCorrect={false}
                                   onChangeText={this.props.onChangeText}/>
                        {this.props.hint && <Text style={styles.hint}>{this.props.hint}</Text>}
                    </View>
                </View>
            </View>
        );
    },
});

var WithoutLabel = React.createClass({
    render: function () {
        return (
            <View style={styles.row}>
                <TextInput style={[styles.textInput,
                this.props.subItem && styles.subTextInput,
                this.props.width && {width: Number(this.props.width)},
                (this.props.keyboardType == 'decimal-pad' || this.props.keyboardType == 'numeric') && styles.textAlignRight,
                this.props.backgroundColor && {backgroundColor: this.props.backgroundColor}]}
                           keyboardType={this.props.keyboardType}
                           placeholder={this.props.placeholder}
                           editable={this.props.hasOwnProperty("editable") ? this.props.editable : true}
                           secureTextEntry={this.props.secureTextEntry}
                           value={this.props.value}
                           autoFocus={this.props.autoFocus}
                           autoCapitalize="none"
                           autoCorrect={false}
                           onChangeText={this.props.onChangeText}/>
                {this.props.hint && <Text style={styles.hint}>{this.props.hint}</Text>}
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
                                        width={this.props.width}
                                        editable={this.props.editable}
                                        keyboardType={keyboardType}
                                        secureTextEntry={this.props.secureTextEntry}
                                        placeholder={this.props.placeholder}
                                        hint={this.props.hint}
                                        value={this.props.value}
                                        backgroundColor={this.props.backgroundColor}
                                        onChangeText={this.props.onChangeText}/>;
        } else {
            fieldRender = <WithLabel label={this.props.label}
                                     extra={this.props.extra}
                                     color={this.props.color}
                                     editable={this.props.editable}
                                     keyboardType={keyboardType}
                                     secureTextEntry={this.props.secureTextEntry}
                                     placeholder={this.props.placeholder}
                                     hint={this.props.hint}
                                     value={this.props.value}
                                     inline={this.props.inline}
                                     onChangeText={this.props.onChangeText}/>;
        }

        return (
            <View>{fieldRender}</View>
        );
    }
});

var styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flex1: {
        flex: 1,
    },
    labelContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        flex: 3,
    },
    label: {
        marginRight: 2,
        marginLeft: 4,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#5A5B5D',
        textAlign: 'right',
    },
    hint: {
        marginRight: 10,
        marginLeft: 6,
        fontSize: 18,
        color: '#5A5B5D',
        textAlign: 'right',
    },
    textContainer: {
        flex: 7,
        //alignItems: 'center',
    },
    textInput: {
        flex: 1,
        color: '#5A5B5D',
        height: 35,
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
        fontWeight: 'normal',
        fontSize: 16,
    },
});

//module.exports = TSTextInput;
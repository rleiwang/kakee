'use strict';

import React from 'react';

import {
    TouchableHighlight,
    StyleSheet,
    View,
    Text,
    Image,
} from 'react-native';

var Button = React.createClass({
    render() {
        return (
            <TouchableHighlight style={styles.toolbarButton} underlayColor="#A9B1B9" onPress={this.props.onPress}>
                <View style={styles.row}>
                    {this.props.buttonData.buttonIcon ?
                        <Image source={this.props.buttonData.buttonIcon} style={styles.icon}/> : null}
                    {this.props.buttonData.buttonText ?
                        <Text style={styles.toolbarButtonText}>{this.props.buttonData.buttonText}</Text> : null}
                </View>
            </TouchableHighlight>
        )
    }
});

module.exports = React.createClass({
    render() {
        //alert(JSON.stringify(this.props));
        var leftButtons = this.props.buttons.map(function (data, index) {
            if (data.buttonPosition == 'L') {
                return <Button key={index} buttonData={data}
                               onPress={data.onPress}/>
            }
        }, this);

        var rightButtons = this.props.buttons.map(function (data, index) {
            if (data.buttonPosition == 'R') {
                return <Button key={index} buttonData={data}
                               onPress={data.onPress}/>
            }
        }, this);

        leftButtons = <View style={styles.alignCenter}>{leftButtons}</View>;
        rightButtons = <View style={styles.alignCenter}>{rightButtons}</View>;

        return (
            <View style={styles.toolbar}>
                {leftButtons}
                <Text style={styles.toolbarTitle}>{this.props.headerTitle}</Text>
                {rightButtons}
            </View>
        );
    }
});

var styles = StyleSheet.create({
    toolbar: {
        //paddingBottom: 5,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#A9B1B9',
    },
    toolbarButton: {
        padding: 5,
        margin: 5,
    },
    toolbarButtonText: {
        fontSize: 18,
        color: '#313F51',
        textAlign: 'center',
    },
    toolbarTitle: {
        color: '#984807',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
        alignItems: 'center',
    },
    alignCenter: {
        alignItems: 'center',
    },
    icon: {
        marginRight: 5,
        width: 15,
        height: 15,
    }
});
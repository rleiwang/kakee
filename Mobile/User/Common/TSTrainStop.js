'use strict';

import React, {
    PropTypes,
} from 'react';

import {
    View,
    StyleSheet,
} from 'react-native';

import TSText from 'shared-modules/TSText';
import TSBadge from 'shared-modules/TSBadge';
import Ionicons from 'react-native-vector-icons/Ionicons';

module.exports = React.createClass({
    getInitialState() {
        return {
            //stopDone: "#5194B9",
            stopDone: "#9ABFCC",
            stopCurr: "#FBBA3A",
            //stopNotYet: "#999999",
            stopNotYet: "#A9B1B9",
        }
    },

    render() {
        let firstBgColor, lastBgColor;

        switch (this.props.trainStop) {
            case "F": /* first stop */
                firstBgColor = this.state.stopCurr;
                lastBgColor = this.state.stopNotYet;
                break;
            case "L": /* last stop */
                firstBgColor = this.state.stopDone;
                lastBgColor = this.state.stopCurr;
                break;
            case "":
                return null;
        }

        return (
            <View style={styles.row}>
                <View style={[styles.arrowIn, {borderTopColor: firstBgColor, borderBottomColor: firstBgColor}]}/>
                <View style={[{height: 28, backgroundColor: firstBgColor, justifyContent: 'center'}]}>
                    <TSText color="#FFFFFF" fontSize="12" fontNormal={true}>
                        {"1.Select Menu"}
                    </TSText>
                </View>
                <View style={styles.wrap}>
                    <View style={[styles.arrowOut, {borderLeftColor: firstBgColor}]}/>
                    <View style={[styles.arrowInAbs, {borderTopColor: lastBgColor, borderBottomColor: lastBgColor}]}/>
                </View>
                <View style={[{height: 28, backgroundColor: lastBgColor, justifyContent: 'center'}]}>
                    <TSText color="#FFFFFF" fontSize="12" fontNormal={true}>
                        {"2.Review Order"}
                    </TSText>
                </View>
                <View style={[styles.arrowOut, {borderLeftColor: lastBgColor}]}/>
            </View>
        )

        /*let draws = stops.map(function (color, index) {
            let number = index + 1;
            if (number < len) {
                return (
                    <View style={styles.row} key={index}>
                        <TSBadge color={color}>{number}</TSBadge>
                        <View style={styles.wrap}>
                        <View style={styles.firstTrainStop}/>
                        <View style={styles.nextTrainStop}/>
                            </View>
                        <Ionicons
                            name="md-arrow-forward"
                            size={20}
                            color='#999999'/>
                    </View>)
            } else {
                return (
                    <TSBadge color={color} key={index}>{number}</TSBadge>
                )
            }
        });
        return <View style={styles.row}>{draws}</View>;*/
    }
});

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    wrap: {
        width: 15,
        height: 28,
    },
    arrowIn: {
        width: 0,
        height: 0,
        //borderTopColor: 'red',
        borderTopWidth: 14,
        borderLeftWidth: 10,
        borderLeftColor: 'transparent',
        borderBottomWidth: 14,
    },
    arrowOut: {
        width: 0,
        height: 0,
        borderTopColor: 'transparent',
        borderTopWidth: 14,
        borderLeftWidth: 10,
        //borderLeftColor: 'red',
        borderBottomWidth: 14,
        borderBottomColor: 'transparent',
    },
    arrowInAbs: {
        position: 'absolute',
        top: 0,
        left: 6,
        width: 0,
        height: 0,
        //borderTopColor: 'red',
        borderTopWidth: 14,
        borderLeftWidth: 10,
        borderLeftColor: 'transparent',
        borderBottomWidth: 14,
        //borderBottomColor: 'red',
    },
})
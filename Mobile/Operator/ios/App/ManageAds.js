'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    StyleSheet,
    View,
} from 'react-native';

import Postal from 'postal';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Connector from '../../Common/Connector';
import TSText from 'shared-modules/TSText';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';

export default class extends Component {

    render() {
        return (
            <View style={styles.container}>
                <TSText>Coming Soon!</TSText>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 5,
        paddingTop: 20,
    },
    column: {
        flexDirection: "column",
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    rowWrap: {
        flexWrap: 'wrap',
        flex: 1,
    },
    flex1: {
        flex: 1,
    },
    flex2: {
        flex: 2,
    },
    flex3: {
        flex: 3,
    },
    flex5: {
        flex: 5,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5A5B5D',
        margin: 4,
        padding: 0,
        marginBottom: 0,
    },
    columnLabel: {
        margin: 2,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#A9B1B9',
        textAlign: 'left',
    },
    dataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 4,
        marginTop: 0,
        marginBottom: 0,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: '#ECECEC',
    },
    highlight: {
        backgroundColor: '#FFFBC9',
    },
    alignLeft: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'flex-end',
    },
});

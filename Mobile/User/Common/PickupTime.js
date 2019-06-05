'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Alert,
    Animated,
    Dimensions,
    StyleSheet,
    TouchableHighlight,
    Picker,
    View,
    Text,
} from 'react-native';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const width = 200;
const height = 230;

export default class extends Component {
    static propTypes = {
        pickupTimes: PropTypes.array.isRequired,
        pickupTime: PropTypes.number.isRequired,
        onSelected: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            offset: new Animated.Value(screenHeight)
        }
    }

    show() {
        Animated.spring(this.state.offset, {toValue: 0}).start();
    }

    render() {
        return (
            <Animated.View style={[styles.modalBackground, {transform: [{translateY: this.state.offset}]}]}>
                <View style={styles.container}>
                    <Picker style={{flex: 1}} selectedValue={this.props.pickupTime} mode='dropdown'
                            onValueChange={this._onValueChange.bind(this)}>
                        {this.props.pickupTimes.map((time, idx) =>
                            <Picker.Item key={idx} value={time}
                                         label={time === 0 ? 'after ready' : `after ${time} minutes`}/>
                        )}
                    </Picker>
                </View>
            </Animated.View>
        );
    }

    _onValueChange(time) {
        this.props.onSelected(time);
        Animated.spring(this.state.offset, {toValue: screenHeight}).start();
    }
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    modalBackground: {
        backgroundColor: '#FFFFFF',
        position: 'absolute',
        top: (screenHeight - height) / 2,
        left: (screenWidth - width) / 2,
        width: width,
        height: height
    },
});

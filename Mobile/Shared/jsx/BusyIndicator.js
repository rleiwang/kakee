'use strict'

import React, {
    Component,
    PropTypes,
} from 'react';

import {
    StyleSheet,
    View,
    DeviceEventEmitter,
} from 'react-native';

import * as Progress from 'react-native-progress';
import Modal from 'react-native-root-modal';

export default class extends Component {
    static propTypes = {
        startVisible: React.PropTypes.bool,
        text: React.PropTypes.string
    };

    static defaultProps = {
        startVisible: false,
        text: 'Please wait...'
    };

    constructor(props) {
        super(props);
        this._emitter = DeviceEventEmitter.addListener('changeLoadingEffect', this._changeLoadingEffect.bind(this), null);
        this.state = {
            isVisible: this.props.startVisible
        };
    }

    componentWillUnmount() {
        this._emitter.remove();
    }

    render() {
        return (
            <Modal animationType={'none'} visible={this.state.isVisible} transparent={true} onRequestClose={() =>{}}>
                <View style={styles.modal}>
                    <Progress.CircleSnail size={100} thickness={8} color={["#3B709F"]}
                                          indeterminate={true} duration={700}/>
                </View>
            </Modal>
        );
    }

    _changeLoadingEffect(state) {
        this.setState({
            isVisible: state.isVisible,
            text: state.title ? state.title : 'Please wait...'
        });
    }
}

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        margin: 20,
        flex: 1
    }
});

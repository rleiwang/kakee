'use strict';

import React from 'react';

import {
    View,
    StyleSheet,
} from 'react-native';

import Modal from 'react-native-root-modal';

module.exports = React.createClass({

    render() {
        let width = function (width) {
            if (width) {
                return {
                    width: width,
                }
            } else {
                return {}
            }

        };

        let height = function (height) {
            if (height) {
                return {
                    height: height,
                }
            } else {
                return {}
            }

        };

        let position = "center";
        if (this.props.position == "top") {
            position = "top";
        }

        return (
            <Modal animationType={'none'} visible={this.props.visible} transparent={true}
                   onRequestClose={this.props.onRequestClose}>
                <View style={[styles.modalContainer, position == 'center' && styles.positionCenter]}>
                    <View
                        style={[styles.innerContainer, position == 'top' && styles.positionTop, width(this.props.width), height(this.props.height)]}>
                        {this.props.children}
                    </View>
                </View>
            </Modal>
        )
    }

});

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        //justifyContent: 'center', /* centers items on the line (the y-axis by default) */
        alignItems: 'center', /* centers items on the cross-axis (x-axis by default) */
        //backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backgroundColor: 'transparent',
    },
    positionCenter: {
        justifyContent: 'center', /* centers items on the line (the y-axis by default) */
    },
    innerContainer: {
        backgroundColor: '#FFFFFF',
        borderColor: '#A9B1B9',
        borderWidth: 1,
        padding: 5,
    },
    positionTop: {
        marginTop: 100,
    },
});
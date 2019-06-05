'use strict';

import React,{
    Component,
    PropTypes
} from 'react';

import {
    StyleSheet,
    View,
    ScrollView,
} from 'react-native';

import Postal from 'postal';

import TSText from './TSText';
import TSButtonPrimary from './TSButtonPrimary';
import Messenger from './Messenger';

export default class extends Component {
    static propTypes = {
        connector: PropTypes.object,
        remote: PropTypes.object,
        remoteChannel: PropTypes.string,
        onPress: PropTypes.func
    };

    constructor(props) {
        super(props);
        this._subs = [Postal.channel("external").subscribe("EnterChat", this._onEnterChat.bind(this))];
        this.state = {
            remoteName: props.remote.name
        }
    }

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    }

    render() {
        return (
            <View style={styles.container}>
                <View style={styles.row} onLayout={this._onLayout.bind(this)}>
                    <TSButtonPrimary buttonIconLeft="md-list" onPress={this.props.onPress}/>
                    <View style={styles.title}><TSText fontSize="20">{this.state.remoteName}</TSText></View>
                </View>
                <Messenger connector={this.props.connector} remoteId={this.props.remote.id}
                           remoteChannel={this.props.remoteChannel} extraHeight={this.state.chatHeaderHeight}/>
            </View>
        );
    }

    _onEnterChat(chat) {
        if (chat.dest.id === this.props.remote.id && chat.name) {
            this.setState({remoteName: chat.name});
        }
    }

    _onLayout(e) {
        let layout = e.nativeEvent.layout;
        this.setState({chatHeaderHeight: layout.height});
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        flex: 1,
        alignItems: 'center',
    }
});
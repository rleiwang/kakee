'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableHighlight,
} from 'react-native';

import ChatSummary from 'shared-modules/ChatSummary';
import ChatWindow from 'shared-modules/ChatWindow';
import TSHeader from 'shared-modules/TSHeader';
import IconNames from 'shared-modules/IconNames';
import Connector from './Connector';

const PAGE = {Summary: 'S', Detail: 'D'};

export default class extends Component {
    static propTypes = {
        conversations: PropTypes.array,
        onRead: PropTypes.func
    };

    constructor(props) {
        super(props);

        this.state = {page: PAGE.Summary};
    }

    render() {
        const buttons = [{
            "buttonPosition": "L",
            "buttonIcon": IconNames.arrowBack,
            onPress: () => this.props.navigator.pop()
        }, {
            "buttonPosition": "R",
            "buttonIcon": IconNames.home,
            onPress: () => this.props.navigator.popToTop()
        }];

        return (
            <View style={styles.container}>
                <TSHeader headerTitle="Chats" buttons={buttons} hideConnection={true}/>
                {this._renderPage()}
            </View>
        );
    }

    _renderPage() {
        switch (this.state.page) {
            case PAGE.Summary:
                return <ChatSummary conversations={this.props.conversations} onRead={this._onRead.bind(this)}/>;
            case PAGE.Detail:
                return <ChatWindow connector={Connector} remoteChannel={"operator"} remote={this.state.remote}
                                   onPress={this._doneRead.bind(this)}/>;
        }
    }

    _onRead(unread) {
        this.setState({remote: unread, page: PAGE.Detail}, ()=> unread.unread = 0);
    }

    _doneRead() {
        this.setState({page: PAGE.Summary});
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Linking,
    Platform,
    Dimensions,
    View,
    Text,
    Navigator,
} from 'react-native';

import GiftedMessenger from 'react-native-gifted-messenger';
import Postal from 'postal';

export default class extends Component {
    static propTypes = {
        connector: PropTypes.object,
        remoteId: PropTypes.string,
        remoteChannel: PropTypes.string,
        extraHeight: PropTypes.number
    };

    constructor(props) {
        super(props);

        this._messages = [];
        this._outgoing = {};

        this._subs = [Postal.channel("external").subscribe("ConversationHistory", this._onHistoryLoaded.bind(this)),
            Postal.channel("external").subscribe("NewMessageAck", this._onMsgAck.bind(this)),
            Postal.channel("external").subscribe("Chat", this._onChat.bind(this))];

        this.state = {
            messages: this._messages,
            isLoadingEarlierMessages: false,
            typingMessage: '',
            allLoaded: false,
            scrollId: null,
            maxHeight: Dimensions.get('window').height - Navigator.NavigationBar.Styles.General.NavBarHeight
        };
    }

    componentDidMount() {
        this._loadHistory();
    }

    componentWillUnmount() {
        this.props.connector.send({
            topic: 'ExitChat',
            dest: {
                id: this.props.remoteId,
                channel: this.props.remoteChannel
            }
        });
        this._subs.forEach(sub => sub.unsubscribe());
    }

    componentWillReceiveProps(nextProps) {
        const {extraHeight} = nextProps;
        if (extraHeight && this._layoutHeight) {
            this.setState({
                maxHeight: this._layoutHeight - Navigator.NavigationBar.Styles.General.StatusBarHeight -
                (extraHeight ? extraHeight : 0)
            });
        }
    }

    setMessageStatus(uniqueId, status) {
        let messages = [];
        let found = false;

        for (let i = 0; i < this._messages.length; i++) {
            if (this._messages[i].uniqueId === uniqueId) {
                let clone = Object.assign({}, this._messages[i]);
                clone.status = status;
                messages.push(clone);
                found = true;
            } else {
                messages.push(this._messages[i]);
            }
        }

        if (found === true) {
            this.setMessages(messages, {});
        }
    }

    setMessages(messages, newstates) {
        this._messages = messages;
        // append the message
        this.setState({
            ...newstates,
            messages: messages
        });
    }

    // {text: msg}
    handleSend(message) {
        let refId = Math.round(Math.random() * 10000);

        this._outgoing[refId] = message;
        let send = this.props.connector.send({
            topic: 'NewMessage',
            dest: {
                id: this.props.remoteId,
                channel: this.props.remoteChannel
            },
            refId: refId,
            msg: message.text
        });

        if (!send) {
            delete this._outgoing[refId];
            // if you couldn't send the message to your server :
            this.setMessageStatus(message.uniqueId, 'ErrorButton');
        }
    }

    onLoadEarlierMessages() {
        // display a loader until you retrieve the messages from your server
        this.setState({isLoadingEarlierMessages: true});

        this._loadHistory();
    }


    // will be triggered when the Image of a row is touched
    onImagePress(message = {}) {
        // Your logic here
        // Eg: Navigate to the user profile
    }

    render() {
        return (
            <View style={{flex: 1}} onLayout={this._onLayout.bind(this)}>
                <GiftedMessenger
                    styles={{ bubbleRight: { marginLeft: 70, backgroundColor: '#007aff' } }}

                    autoFocus={false}
                    messages={this.state.messages}
                    handleSend={this.handleSend.bind(this)}
                    onErrorButtonPress={this.handleSend.bind(this)}
                    maxHeight={this.state.maxHeight}

                    loadEarlierMessagesButton={!this.state.allLoaded}
                    onLoadEarlierMessages={this.onLoadEarlierMessages.bind(this)}

                    senderName=''
                    senderImage={null}
                    onImagePress={this.onImagePress.bind(this)}
                    displayNames={true}

                    isLoadingEarlierMessages={this.state.isLoadingEarlierMessages}

                    typingMessage={this.state.typingMessage}
                />
            </View>
        );
    }

    _loadHistory() {
        this.props.connector.send({
            topic: 'ConversationHistory',
            senderId: this.props.remoteId,
            scrollId: this.state.scrollId
        });
    }

    _onHistoryLoaded(conversation) {
        let message = conversation.dialogues.map(this._mapToGiftedMessage.bind(this));

        let newstate = {
            isLoadingEarlierMessages: false,
            scrollId: conversation.scrollId,
            allLoaded: !conversation.scrollId
        };
        // prepend oldest messages to the beginning of the array
        this.setMessages(message.concat(this._messages), newstate);
        this.props.connector.send({
            topic: 'EnterChat',
            dest: {
                id: this.props.remoteId,
                channel: this.props.remoteChannel
            }
        });
    }

    // msg { text: 'text', pos: 'left'/right, ts: '', msgId: }
    _mapToGiftedMessage(msg) {
        // must contains: text, name, image, position: 'left', date, uniqueId
        return {
            text: msg.text,
            position: msg.pos,
            date: new Date(msg.ts),
            uniqueId: msg.msgId
        }
    }

    _onMsgAck(ack) {
        let msg = this._outgoing[ack.refId];
        delete this._outgoing[ack.refId];
        msg.uniqueId = ack.msgId;
        delete msg.status;

        // new messages append
        this.setMessages(this._messages.concat(msg), {});
    }

    _onChat(chat) {
        let msgs = chat.chats.map(msg => {
            return {
                text: msg.text,
                position: msg.pos,
                date: new Date(),
                uniqueId: msg.msgId
            };
        });
        // new messages append
        this.setMessages(this._messages.concat(msgs), {});
    }

    _onLayout(e) {
        let layout = e.nativeEvent.layout;
        this._layoutHeight = layout.height;
        this.setState({
            maxHeight: this._layoutHeight - Navigator.NavigationBar.Styles.General.StatusBarHeight -
            (this.props.extraHeight ? this.props.extraHeight : 0)
        });
    }
}

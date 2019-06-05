'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Alert,
    StyleSheet,
    View,
} from 'react-native';

import Postal from 'postal';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Connector from '../../Common/Connector';
import Button from 'shared-modules/Button';
import TSText from 'shared-modules/TSText';
import TSLongTextInput from 'shared-modules/TSLongTextInput';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';

const MAX_CHARS = 120;
export default class extends Component {
    static propTypes = {};

    constructor(props) {
        super(props);
        this._subs = [Postal.channel("external").subscribe("Announcement", this._onAnnouncement.bind(this))];
        this.state = {
            msgId: null,
            msg: ''
        };
    }

    componentWillMount() {
        Connector.send({
            topic: 'Announcement',
            status: 'QUERY'
        });
    }

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    }

    render() {
        return (
            <View style={styles.container}>
                <TSText fontNormal={true}
                        fontSize="12">{MAX_CHARS - (this.state.msg ? this.state.msg.length : 0)}</TSText>
                <TSLongTextInput placeholder='Type announcement'
                                 value={this.state.msg}
                                 onChangeText={this.handleOnChangeMsg.bind(this)}/>
                <View style={styles.row}>
                    {this.state.msgId &&
                    <TSButtonSecondary label="Remove Announcement" onPress={this.deleteAnnouncement.bind(this)}/>}
                    <View style={styles.flex1}/>
                    <TSButtonPrimary label='Save Announcement' onPress={this.makeAnnouncement.bind(this)}/>
                </View>
            </View>
        );
    }

    handleOnChangeMsg(text) {
        if (text.length <= MAX_CHARS) {
            this.setState({msg: text});
        }
    }

    makeAnnouncement() {
        if (this.state.msg && this.state.msg.length > 0) {
            if (this.state.msgId) {
                Connector.send({
                    topic: 'Announcement',
                    status: 'UPDATE',
                    id: this.state.msgId,
                    msg: this.state.msg
                });
            } else {
                Connector.send({
                    topic: 'Announcement',
                    status: 'NEW',
                    msg: this.state.msg
                });
            }
        }
    }

    deleteAnnouncement() {
        Connector.send({
            topic: 'Announcement',
            status: 'DELETE',
            id: this.state.msgId
        });
    }

    _onAnnouncement(announcement) {
        if (announcement.status === 'DELETE') {
            Alert.alert("deleted");
            this.setState({
                msgId: null,
                msg: ''
            }, () => this.props.onChange(0));
        } else {
            if (announcement.status !== 'QUERY') {
                Alert.alert("saved");
            }
            this.setState({
                msgId: announcement.id,
                msg: announcement.msg
            }, () => this.props.onChange(announcement.id ? 1 : 0));
        }
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

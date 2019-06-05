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

import Ionicons from 'react-native-vector-icons/Ionicons';

import TSBadge from 'shared-modules/TSBadge';
import TSText from './TSText';

class SummaryRow extends Component {
    static propTypes = {
        detailFontSize: PropTypes.string,
        detail: PropTypes.string,
        rowMargin: PropTypes.bool,
        fontNormal: PropTypes.bool,
        indent: PropTypes.string,
        header: PropTypes.string,
        color: PropTypes.string,
        showChevron: PropTypes.bool
    };

    constructor(props) {
        super(props);
    }

    render() {
        let detailFontSize = "14";
        if (this.props.detailFontSize) {
            detailFontSize = this.props.detailFontSize;
        }

        return (
            <View style={[styles.dataRow, this.props.indent === "right" && styles.indentRight,
                    this.props.indent === "left" && styles.indentLeft,
                    this.props.rowMargin && styles.rowMargin]}>
                <View style={[styles.row, styles.flex1]}>
                    <TSText fontNormal={this.props.fontNormal}>{this.props.header}</TSText>
                    {this.props.detail !== "0" && <TSBadge>{this.props.detail}</TSBadge>}
                    {/*<TSText fontNormal={true} fontSize={detailFontSize}
                            color={this.props.color}>{this.props.detail}</TSText>*/}
                </View>
                {this.props.showChevron && <View style={styles.column}>
                    <Ionicons
                        name="ios-arrow-forward"
                        size={30}
                        color="#5A5B5D"
                        style={styles.icon}/>
                </View>}
            </View>
        )
    }
}

export default class extends Component {
    static propTypes = {
        conversations: PropTypes.array,
        onRead: PropTypes.func
    };

    constructor(props) {
        super(props);
    }

    render() {
        if (this.props.conversations) {
            if (this.props.conversations.length > 0) {
                return <ScrollView>{this.props.conversations.map((unread, idx) => {
                    return <TouchableHighlight key={idx} underlayColor="#A9B1B9"
                                               onPress={() => this.props.onRead(unread)}>
                        <View>
                            <SummaryRow header={unread.name}
                                        detail={unread.unread.toString()}
                                        fontNormal={unread.unread <= 0}
                                        showChevron={true}/>
                        </View>
                    </TouchableHighlight>
                })}</ScrollView>
            } else {
                return <TSText>No messages</TSText>
            }
        } else {
            return <TSText>Loading...</TSText>
        }
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 5,
        paddingTop: 20,
    },
    dataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
        paddingLeft: 0,
        borderBottomWidth: 1,
        borderBottomColor: "#A9B1B9",
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    column: {
        flexDirection: "column",
    },
    icon: {
        margin: 2,
        width: 25,
        height: 25,
    },
    flex1: {
        flex: 1,
    },
    indentLeft: {
        alignItems: 'flex-start',
        marginRight: 100,
        //backgroundColor: '#A9B1B9',
        backgroundColor: '#E0E2DA',
        borderRadius: 15,
        borderBottomLeftRadius: 0,
    },
    indentRight: {
        alignItems: 'flex-end',
        textAlign: 'right',
        marginLeft: 100,
        backgroundColor: '#DAEAF0',
        borderRadius: 15,
        borderBottomRightRadius: 0,
    },
    rowMargin: {
        margin: 5,
    },
});

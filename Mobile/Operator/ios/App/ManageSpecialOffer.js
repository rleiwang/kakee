'use strict';

import React from 'react';

import {
    Alert,
    DatePickerIOS,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from 'react-native';

import Postal from 'postal';
import numeral from 'numeral';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import TSText from 'shared-modules/TSText';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';
import TSTextInput from 'shared-modules/TSTextInput';
import TSLongTextInput from 'shared-modules/TSLongTextInput';

import Connector from '../../Common/Connector';

console.ignoredYellowBox = ['Warning: Failed propType'];

module.exports = React.createClass({
    getInitialState() {
        const today = new Date();
        this._subs = [Postal.channel("external").subscribe("SpecialOffer",
            (specialOffer) => {
                if (specialOffer.deleted) {
                    this.setState({
                        version: undefined,
                        fromDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0),
                        toDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
                        discountPct: '',
                        notes: null
                    }, () => {
                        Alert.alert("deleted");
                        this.props.onChange(false, 0);
                    });
                } else {
                    this.setState({
                        version: specialOffer.version,
                        fromDate: new Date(specialOffer.startDate),
                        toDate: new Date(specialOffer.endDate),
                        discountPct: numeral(+(specialOffer.discount * 100).toFixed(2)).format('0.00'),
                        notes: specialOffer.notes
                    }, () => {
                        Alert.alert("saved");
                        this.props.onChange(false, 1);
                    });
                }
            })];

        const {specialOffer} = this.props;
        this._types = {"P": "Mobile Orders Only", "S": "Onsite Orders Only", "B": "Both"};
        return specialOffer ? {
            version: specialOffer.version,
            fromDate: new Date(specialOffer.startDate),
            toDate: new Date(specialOffer.endDate),
            discountPct: numeral(+(specialOffer.discount * 100).toFixed(2)).format('0.00'),
            notes: specialOffer.notes,
            type: specialOffer.type,
        } : {
            fromDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0),
            toDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
            discountPct: '',
            notes: null,
            type: "B",
        };
    },

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    },

    _onFromDateChange(date) {
        let startOfDate = date;
        startOfDate.setHours(0, 0, 0, 0);

        this.setState({fromDate: startOfDate});
    },

    _onToDateChange(date) {
        let endOfDate = date;
        endOfDate.setHours(23, 59, 59, 999);

        this.setState({toDate: endOfDate});
    },

    _onDiscountChange(text){
        if (isNaN(text)) {
            Alert.alert("Error", "Discount is not a valid number");
        } else {
            this.setState({discountPct: text});
        }
    },

    _onNotesChange(text) {
        this.setState({notes: text});
    },

    _onSave() {
        if (this.state.fromDate > this.state.toDate) {
            Alert.alert("Date Error", "From Date can't be greater than To Date.");
            return;
        }

        if (this.state.discountPct === '') {
            Alert.alert("Nothing to Save", "No promotion or notes entered.");
            return;
        }

        // if version is valid, server will delete "version", create a new specialoffer
        Connector.send({
            topic: 'SpecialOffer',
            startDate: this.state.fromDate.getTime(),
            endDate: this.state.toDate.getTime(),
            discount: numeral(Number(this.state.discountPct)).divide(100).value(),
            notes: this.state.notes,
            type: this.state.type,
            version: this.state.version
        })
    },

    _onDelete() {
        Connector.send({
            topic: 'SpecialOffer',
            version: this.state.version,
            deleted: true
        });
    },

    render() {
        return (
            <KeyboardAwareScrollView style={styles.container}>
                <View style={styles.row}>
                    <View style={[styles.column, styles.flex1]}>
                        <TSText>From Date</TSText>
                        <DatePickerIOS
                            date={this.state.fromDate}
                            mode="date"
                            onDateChange={this._onFromDateChange}/>
                    </View>
                    <View style={[styles.column, styles.flex1]}>
                        <TSText>To Date</TSText>
                        <DatePickerIOS
                            date={this.state.toDate}
                            mode="date"
                            onDateChange={this._onToDateChange}/>
                    </View>
                </View>
                <View style={styles.row}>
                    <TSText>Apply </TSText>
                    <TSTextInput width="100" keyboardType="decimal-pad"
                                 onChangeText={this._onDiscountChange}
                                 value={this.state.discountPct}/>
                    <TSText>% discount automatically</TSText>
                </View>
                <TSLongTextInput placeholder='Type special offer that can be viewed by customers'
                                 value={this.state.notes}
                                 onChangeText={this._onNotesChange}/>
                <TSText style={styles.marginTop}>Special Discount Applies To</TSText>
                <View style={[styles.row, styles.justifyAround]}>
                    {Object.keys(this._types).map(type => {
                        return (<View key={type} style={styles.row}>
                                <Switch value={this.state.type === type}
                                        onValueChange={() => {this.setState({type: type})}}/>
                                <TSText fontNormal={true}>{this._types[type]}</TSText>
                            </View>
                        )
                    })}
                </View>
                <View style={[styles.row, styles.marginTop]}>
                    <TSButtonSecondary label="Remove Special Offer" onPress={this._onDelete}/>
                    <View style={styles.flex1}/>
                    <TSButtonPrimary label='Save Special Offer' onPress={this._onSave}/>
                </View>
            </KeyboardAwareScrollView>
        );
    }
});

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
    marginTop: {
        marginTop: 20,
    },
    justifyAround: {
        justifyContent: 'space-between',
    },
});
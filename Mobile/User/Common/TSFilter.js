'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';

import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import TSTextInput from 'shared-modules/TSTextInput';
import TSAds from './TSAds';

export default class extends Component {
    static propTypes = {
        filter: PropTypes.object.isRequired,
        onCancel: PropTypes.func.isRequired,
        onApply: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);

        this._categories = {
            "US": "American", "CN": "Chinese", "IN": "Indian", "IT": "Italian",
            "JP": "Japanese", "KR": "Korean", "MT": "Mediterranean", "MX": "Mexican",
            "TH": "Thai", "VN": "Vietnamese"
        };

        const {filter} = props;

        this.state = {
            name: filter.name,
            favorite: filter.favorite,
            tryout: filter.tryout,
            hasSpecialOffer: filter.hasSpecialOffer,
            selectedCategories: this._mapToSelected(filter.categories)
        };
    }

    _mapToSelected(categories) {
        return categories.reduce((map, cat) => {
            map[cat] = true;
            return map;
        }, {});
    }

    _onFoodTruckNameChange(text) {
        this.setState({name: text});
    }

    _onFavoriteChange(value) {
        this.setState({favorite: value});
    }

    _onMustTryChange(value) {
        this.setState({tryout: value});
    }

    _onSpecialOfferChange(value) {
        this.setState({hasSpecialOffer: value});
    }

    _onCategoryChange(key, value) {
        if (value) {
            this.state.selectedCategories[key] = true;
        } else {
            delete this.state.selectedCategories[key];
        }

        this.setState({selectedCategories: this.state.selectedCategories}, () => {
                console.log(this.state.selectedCategories)
            }
        );
    }

    _renderCategories(categories) {
        return categories.map((data, index) =>
            <View key={index} style={[styles.row, styles.switchRowMargin]}>
                <Switch value={this.state.selectedCategories.hasOwnProperty(data)}
                        onValueChange={this._onCategoryChange.bind(this, data)}/>
                <TSText fontNormal={true}>{this._categories[data]}</TSText>
            </View>
        );
    }

    _createFilter() {
        return {
            name: this.state.name,
            favorite: this.state.favorite,
            tryout: this.state.tryout,
            hasSpecialOffer: this.state.hasSpecialOffer,
            categories: Object.keys(this.state.selectedCategories)
        };
    }

    render() {
        const buttons = [{
            "buttonPosition": "L", "buttonText": "Cancel", onPress: () => this.props.onCancel()
        }, {
            "buttonPosition": "R", "buttonText": "Search", onPress: () => this.props.onApply(this._createFilter())
        }];

        const favoriteIcon = this.state.favorite ? "ios-heart" : "ios-heart-outline";
        const mustTryIcon = this.state.tryout ? "ios-bulb" : "ios-bulb-outline";

        let first = [];
        let second = [];

        let i = 0;
        for (let key in this._categories) {
            if (i % 2) { // odd number
                second.push(key);
            } else {
                first.push(key);
            }
            i++;
        }

        return (
            <View style={styles.container}>
                <TSHeader headerTitle="Filters"
                          buttons={buttons}
                          hideConnection={true}
                          onPress={this.handleHeaderBtnOnPress}/>
                <View style={styles.content}>
                    <ScrollView>
                        <TSText>Food Truck Name</TSText>
                        <TSTextInput value={this.state.name}
                                     onChangeText={this._onFoodTruckNameChange.bind(this)}/>
                        <TSText style={styles.marginTop}>Type</TSText>
                        <View style={[styles.row, styles.marginLeft]}>
                            <Switch value={this.state.favorite} onValueChange={this._onFavoriteChange.bind(this)}/>
                            <TSText fontNormal={true}>My Favorites List </TSText>
                            <Ionicons name={favoriteIcon} size={25} color='#5A5B5D' style={styles.icon}/>
                        </View>
                        <View style={[styles.row, styles.marginLeft]}>
                            <Switch
                                value={this.state.tryout} onValueChange={this._onMustTryChange.bind(this)}/>
                            <TSText fontNormal={true}>My Must Try List </TSText>
                            <Ionicons name={mustTryIcon} size={25} color='#5A5B5D' style={styles.icon}/>
                        </View>
                        <View style={[styles.row, styles.marginLeft]}>
                            <Switch value={this.state.hasSpecialOffer}
                                    onValueChange={this._onSpecialOfferChange.bind(this)}/>
                            <TSText fontNormal={true}>Special Offers</TSText>
                        </View>
                        <TSText style={styles.marginTop}>Category</TSText>
                        <View style={[styles.row, styles.switchMargin]}>
                            <View style={styles.row}>
                                <View style={[styles.flex1, styles.selfAlignTop]}>
                                    {this._renderCategories(first)}
                                </View>
                                <View style={[styles.flex1, styles.selfAlignTop]}>
                                    {this._renderCategories(second)}
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </View>
                <TSAds style={styles.bannerArea}/>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        margin: 5,
        marginTop: 10,
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    marginLeft: {
        marginLeft: 20,
    },
    marginTop: {
        marginTop: 20,
    },
    flex1: {
        flex: 1,
    },
    icon: {
        alignSelf: 'center',
        width: 25,
        height: 25,
        margin: 2,
    },
    switchMargin: {
        margin: 10,
    },
    switchRowMargin: {
        margin: 5,
    },
    selfAlignTop: {
        alignSelf: 'flex-start',
    },
    bannerArea: {
        height: 50,
    },
});
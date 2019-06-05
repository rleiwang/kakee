'use strict';

import React,{
    Component,
    PropTypes
} from 'react';

import {
    StyleSheet,
    View,
} from 'react-native';

import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MapView from 'react-native-maps';

import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import TSAds from './TSAds';

// a mile range
const LATITUDE_DELTA = 0.0562;
const LONGITUDE_DELTA = 0.048;

const GREEN_COLOR = "#23CF5F";

class TruckCalloutView extends Component {
    static propTypes = {
        truck: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
        this._categories = {
            "US": "American", "CN": "Chinese", "IN": "Indian", "IT": "Italian",
            "JP": "Japanese", "KR": "Korean", "MT": "Mediterranean", "MX": "Mexican",
            "TH": "Thai", "VN": "Vietnamese"
        }
    }

    render() {
        const category = this._categories[this.props.truck.category];

        const dollarShow = <FontAwesome name='dollar'
                                        size={15}
                                        color='#5A5B5D'
                                        style={styles.imageIcon}/>;


        const dollarFade = <FontAwesome name='dollar'
                                        size={15}
                                        color='#DEE1E5'
                                        style={styles.imageIcon}/>;

        var priceRange, dollarFld;

        if (this.props.truck.priceRange == "01") {
            priceRange = true;
            dollarFld = <View style={styles.row}>
                {dollarShow}
                {dollarFade}
                {dollarFade}
            </View>;
        } else if (this.props.truck.priceRange == "02") {
            priceRange = true;
            dollarFld = <View style={styles.row}>
                {dollarShow}
                {dollarShow}
                {dollarFade}
            </View>;
        } else if (this.props.truck.priceRange == "03") {
            priceRange = true;
            dollarFld = <View style={styles.row}>
                {dollarShow}
                {dollarShow}
                {dollarShow}
            </View>;
        }

        return (
            <View>
                <View style={styles.row}>
                    <TSText>{this.props.truck.name}</TSText>
                </View>
                {this.props.truck.phone &&
                <TSText fontNormal={true} fontSize="15">{this.props.truck.phone}</TSText>}
                <View style={styles.row}>
                    {category &&
                    <TSText fontNormal={true} fontSize="15">{category}  </TSText>}
                    {priceRange && dollarFld}
                </View>
            </View>
        )
    }
}

export default class extends Component {
    static propTypes = {
        truck: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
        this._pinColor = props.truck.pending >= 0 ? GREEN_COLOR : undefined;
        this.state = {
            currentRegion: {
                ...props.truck.location,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA
            },
        };
    }

    render() {
        const buttons = [{
            buttonPosition: "R",
            buttonIcon: "ios-close-circle-outline",
            onPress: () => this.props.navigator.pop()
        }];

        return (
            <View style={styles.container}>
                <TSHeader headerTitle={this.props.truck.truckName}
                          buttons={buttons}
                          hideConnection={true}/>
                <MapView style={styles.flex1}
                         region={this.state.currentRegion}
                         showsUserLocation={true}
                         showsPointsOfInterest={false}
                         onRegionChangeComplete={this._handleOnRegionChangeComplete.bind(this)}>
                    <MapView.Marker pinColor={this._pinColor} coordinate={this.props.truck.location}>
                        <MapView.Callout>
                            <TruckCalloutView truck={this.props.truck} onPress={() => {}}/>
                        </MapView.Callout>
                    </MapView.Marker>
                </MapView>
                <TSAds style={styles.bannerArea}/>
            </View>
        );
    }

    _handleOnRegionChangeComplete(region) {
        this.setState({currentRegion: region});
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flex1: {
        flex: 1,
    },
    bannerArea: {
        height: 50,
    },
    imageIcon: {
        width: 10,
        height: 15,
    }
});
'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    Alert,
    NativeModules,
    StyleSheet,
    ScrollView,
    Text,
    TouchableHighlight,
    View
} from 'react-native';


import MapView from 'react-native-maps';

import GeoLocation from '../../Common/GeoLocation';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import TSButtonSecondary from 'shared-modules/TSButtonSecondary';

// street range
const LATITUDE_DELTA = 0.008243894505248761;
const LONGITUDE_DELTA = 0.010471345283392;

export default class extends Component {
    static propTypes = {
        region: PropTypes.object,
        onSetRegion: PropTypes.func,
        onCancel: PropTypes.func,
    };

    constructor(props) {
        super(props);
        this.state = {
            region: props.region
        };
        if (props.region) {
            this.state.marker = {
                latitude: props.region.latitude,
                longitude: props.region.longitude
            }
        }
    }

    render() {
        return (
            <View>
                <MapView style={styles.mapModal}
                         region={this.state.region}
                         showsUserLocation={false}
                         showsPointsOfInterest={false}
                         onLongPress={this._setMarker.bind(this)}
                         onRegionChangeComplete={this._onRegionChangeComplete.bind(this)}>
                    {this._renderMarker()}
                </MapView>
                <View style={styles.row}>
                    <TSButtonSecondary label="Last Saved Location" onPress={this._savedLocation.bind(this)}/>
                    <View style={styles.flex1}/>
                    <TSButtonSecondary label="Cancel" onPress={this.props.onCancel}/>
                </View>
                <View style={styles.row}>
                    <TSButtonSecondary label="Current Location" onPress={this._locate.bind(this)}/>
                    <View style={styles.flex1}/>
                    {this.state.marker &&
                    <TSButtonPrimary label="Use Marked Location" onPress={this._setLocation.bind(this)}/>}
                </View>
            </View>
        );
    }

    _renderMarker() {
        return this.state.marker ?
            <MapView.Marker draggable coordinate={this.state.marker} onDragEnd={this._setMarker.bind(this)}/>
            : null;
    }

    _setMarker(e) {
        this.setState({marker: e.nativeEvent.coordinate});
    }

    _setLocation() {
        const region = {
            latitude: this.state.marker.latitude,
            longitude: this.state.marker.longitude,
            latitudeDelta: this.state.region.latitudeDelta,
            longitudeDelta: this.state.region.longitudeDelta,
        };

        // set location manually
        GeoLocation.setRegion(region);

        if (this.props.onSetRegion) {
            this.props.onSetRegion(region);
        }
    }

    _savedLocation() {
        const savedRegion = GeoLocation.whereAmI();
        if (savedRegion) {
            this.setState({
                region: savedRegion,
                marker: {
                    latitude: savedRegion.latitude,
                    longitude: savedRegion.longitude
                }
            });
        }
    }

    _locate() {
        const gps = GeoLocation.myGPSLocation();
        if (gps === undefined) {
            Alert.alert("No GPS");
            return;
        }
        let marker = {
            latitude: gps.latitude,
            longitude: gps.longitude
        };

        let region = {};
        const savedRegion = GeoLocation.whereAmI();
        if (savedRegion.hasOwnProperty("latitudeDelta") &&
            savedRegion.hasOwnProperty("longitudeDelta")) {
            region.latitudeDelta = savedRegion.latitudeDelta;
            region.longitudeDelta = savedRegion.longitudeDelta;
        } else {
            region.latitudeDelta = LATITUDE_DELTA;
            region.longitudeDelta = LONGITUDE_DELTA;
        }

        this.setState({
            region: {...marker, ...region},
            marker: marker
        });
    }

    _onRegionChangeComplete(region) {
        this.setState({region: region});
    }
}

const styles = StyleSheet.create({
    mapModal: {
        flex: 1,
        height: 500,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    flex1: {
        flex: 1,
    },
});

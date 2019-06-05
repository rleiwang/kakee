'use strict';

import React from 'react';

import {
    Alert,
    Linking,
    NativeModules,
    StyleSheet,
    Switch,
    View,
    TouchableHighlight,
    Image,
} from 'react-native';

import Postal from 'postal';

import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import Button from 'shared-modules/Button';
import TSText from 'shared-modules/TSText';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import TSTextInput from 'shared-modules/TSTextInput';
import TSLongTextInput from 'shared-modules/TSLongTextInput';
import DeviceInfo from 'shared-modules/DeviceInfo';
import IconNames from 'shared-modules/IconNames';

import Realm from '../../Common/Realm/RealmSingleton';
import Connector from '../../Common/Connector';
import PhotosView from './PhotosView';
import Square from './Square';

let Utils = NativeModules.Utils;

const CategoryRow = React.createClass({

    getInitialState() {
        return {
            categories: {
                "US": "American", "CN": "Chinese", "IN": "Indian", "IT": "Italian",
                "JP": "Japanese", "KR": "Korean", "MT": "Mediterranean", "MX": "Mexican",
                "TH": "Thai", "VN": "Vietnamese", "OT": "Other"
            },
        };
    },

    render() {
        return (
            <View style={[styles.row, styles.switchRowMargin]}>
                <Switch
                    value={this.props.rowData == this.props.category}
                    onValueChange={(value) => {
                        this.props.onValueChange(value)
                    }}/>
                <TSText fontNormal={true}>{this.state.categories[this.props.rowData]}</TSText>
            </View>
        );
    }
});

module.exports = React.createClass({

    getInitialState() {
        this._subs = [Postal.channel("external").subscribe("Profile", this._onProfilePublished)];
        this._paypalBtn =
            <Button onPress={() => Linking.openURL('https://www.paypal.com')}>
                <FontAwesome name="paypal" size={20} color="#3B709F"/>
            </Button>;

        this._squareBtn =
            <Button onPress={() => Linking.openURL('https://connect.squareup.com/apps')}>
                <FontAwesome name="square" size={20} color="#3B709F"/>
            </Button>;

        return {
            categories: {
                "US": "American", "CN": "Chinese", "IN": "Indian", "IT": "Italian",
                "JP": "Japanese", "KR": "Korean", "MT": "Mediterranean", "MX": "Mexican",
                "TH": "Thai", "VN": "Vietnamese", "OT": "Other"
            },
            profile: {
                email: this.props.profile.email,
                ccp: Realm.PaymentType.SQUARE
            },
            saveWarning: false,
            photoImage: null,
        };
    },

    componentWillMount() {
        this.loadProfileFromDB(Realm.loadProfile())
    },

    componentWillUnmount() {
        this._subs.forEach(sub => sub.unsubscribe());
    },

    loadProfileFromDB(data) {
        if (data && data.length > 0) {
            let photoImage = data[0].photo;
            delete data[0].photo;
            this.setState({profile: data[0], photoImage: photoImage});
        }
    },

    handleTextChange(field, text) {
        if (field === 'phone' && text) {
            let b = text.replace(/\D/g, '');
            if (b.length < 4) {
                text = "(" + b + ")";
            } else if (b.length < 7) {
                text = "(" + b.substr(0, 3) + ") " + b.substr(3);
            } else {
                text = "(" + b.substr(0, 3) + ") " + b.substr(3, 3) + "-" + b.substr(6, 4);
            }
        }
        // clone a new profile before edit
        let profile = {...this.state.profile};
        profile[field] = text;

        this.setState({profile: profile, saveWarning: true});
        this.props.onChange(true);
    },

    // key is the key of category, and value is true or false
    handleUpdateCategory(key, value) {
        let profile = {...this.state.profile};

        if (value == true) {
            profile.category = key;
        } else {
            profile.category = null;
        }

        this.setState({profile: profile, saveWarning: true});
        this.props.onChange(true);
    },

    handleUpdatePriceRange(key, value) {
        let profile = {...this.state.profile};

        if (value == true) {
            profile.priceRange = key;
        } else {
            profile.priceRange = null;
        }

        this.setState({profile: profile, saveWarning: true});
        this.props.onChange(true);
    },

    handleUpdateCCP(value) {
        if (this.state.profile.ccp !== value) {
            let tmp = {...this.state.profile};
            tmp.ccp = value;

            this.setState({profile: tmp, saveWarning: true});
            this.props.onChange(true);
        }
    },

    _handlePhotoView()
    {
        this.props.navigator.push({
            title: 'PhotosView',
            name: 'PhotosView',
            component: PhotosView,
            passProps: {
                onSelect: (image) => this.handleOnselect(image),
            }
        });
    },

    handleOnselect(image) {
        Utils.readImage(image.uri)
            .then((base64Image) => {
                this.setState({photoImage: base64Image, saveWarning: true})
                this.props.onChange(true);
            });
    },

    publishProfile() {
        Connector.send({
            topic: 'Profile',
            operatorId: DeviceInfo.info().uniqueID,
            ...this.state.profile,
            photo: this.state.photoImage
        });
    },

    _onProfilePublished(publishedProfile) {
        if (publishedProfile.version) {
            let profile = {...this.state.profile};
            profile.timestamp = Date.now();
            profile.photo = this.state.photoImage;
            profile.version = publishedProfile.version;
            Realm.saveProfile(profile)
                .then(this._handleDbSaved)
                .catch(e => {
                    console.log(e);
                    Alert.alert("Error Saving", "Make sure all required fields are filled.");
                });
        } else {
            // if profile doesn't version
            Alert.alert("Error to publish profile");
        }
    },

    _handleDbSaved(profile) {
        this.setState({saveWarning: false, profile: profile});

        this.props.onChange(false);
        if (profile.sq_token) {
            Square.setAccessToken(profile.sq_token, (err) => {
                if (err) {
                    Alert.alert("Invalid Square Access Token")
                } else {
                    Alert.alert("Saved");
                }
            });
        } else {
            Alert.alert("Saved");
        }
    },

    render() {

        var first = [];
        var second = [];

        var i = 0;
        for (var key in this.state.categories) {
            if (i % 2) { // odd number
                second.push(key);
            } else {
                first.push(key);
            }
            i++;
        }

        var firstCol = first.map(function (data, index) {
            return <CategoryRow key={index}
                                rowIndex={index}
                                rowData={data}
                                category={this.state.profile.category}
                                onValueChange={this.handleUpdateCategory.bind(this, data)}
            />
        }, this);

        var secondCol = second.map(function (data, index) {
            return <CategoryRow key={index}
                                rowIndex={index}
                                rowData={data}
                                category={this.state.profile.category}
                                onValueChange={this.handleUpdateCategory.bind(this, data)}
            />
        }, this);

        return (
            <View style={styles.container}>
                <KeyboardAwareScrollView extraHeight={95}>
                    <View style={[styles.row, styles.flexStart, styles.marginBottom10]}>
                        <View style={styles.flex3}>
                            <View style={styles.imageMargin}>
                                <TouchableHighlight style={styles.flex1} underlayColor="#A9B1B9"
                                                    onPress={this._handlePhotoView}>
                                    <View>
                                        {this.state.photoImage &&
                                        <View>
                                            <Image style={styles.image}
                                                   source={{uri: `data:image/png;base64,${this.state.photoImage}`}}/>
                                        </View>}
                                        {!this.state.photoImage && <View style={styles.imageIcon}>
                                            <Ionicons name={IconNames.image} size={50} color='#5194B9'/>
                                            <TSText fontSize="12" fontNormal={true} color="#3B709F">Add a Profile
                                                Photo</TSText>
                                        </View>}
                                    </View>
                                </TouchableHighlight>
                            </View>
                        </View>
                        <View style={styles.flex7}>
                            <TSTextInput placeholder="*Food Truck Name"
                                         value={this.state.profile.name}
                                         onChangeText={this.handleTextChange.bind(this, "name")}/>
                            <TSTextInput placeholder="*Phone Number"
                                         keyboardType="phone-pad" value={this.state.profile.phone}
                                         onChangeText={this.handleTextChange.bind(this, "phone")}/>
                            <TSLongTextInput placeholder="Description"
                                             value={this.state.profile.descr}
                                             onChangeText={this.handleTextChange.bind(this, "descr")}/>
                            <TSTextInput placeholder="Primary Operating City"
                                         value={this.state.profile.primaryCity}
                                         onChangeText={this.handleTextChange.bind(this, "primaryCity")}/>
                        </View>
                    </View>
                    <View style={[styles.row, styles.switchMargin]}>
                        <View style={[styles.flex3, styles.selfAlignTop]}>
                            <TSText number={true}>*Category</TSText>
                        </View>
                        <View style={styles.flex7}>
                            <View style={styles.row}>
                                <View style={[styles.flex1, styles.selfAlignTop]}>
                                    {firstCol}
                                </View>
                                <View style={[styles.flex1, styles.selfAlignTop]}>
                                    {secondCol}
                                </View>
                            </View>
                        </View>
                    </View>
                    <View style={[styles.row, styles.switchMargin]}>
                        <View style={styles.flex3}>
                            <TSText number={true}>*Price Range</TSText>
                        </View>
                        <View style={styles.flex7}>
                            <View style={styles.row}>
                                <View style={styles.flex1}>
                                    <View style={[styles.row, styles.switchRowMargin]}>
                                        <Switch
                                            value={this.state.profile.priceRange == "01"}
                                            onValueChange={this.handleUpdatePriceRange.bind(this, "01")}/>
                                        <TSText fontNormal={true}>$</TSText>
                                    </View>
                                </View>
                                <View style={styles.flex1}>
                                    <View style={[styles.row, styles.switchRowMargin]}>
                                        <Switch
                                            value={this.state.profile.priceRange == "02"}
                                            onValueChange={this.handleUpdatePriceRange.bind(this, "02")}/>
                                        <TSText fontNormal={true}>$$</TSText>
                                    </View>
                                </View>
                                <View style={styles.flex1}>
                                    <View style={[styles.row, styles.switchRowMargin]}>
                                        <Switch
                                            value={this.state.profile.priceRange == "03"}
                                            onValueChange={this.handleUpdatePriceRange.bind(this, "03")}/>
                                        <TSText fontNormal={true}>$$$</TSText>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                    <View style={[styles.row, styles.switchMargin]}>
                        <View style={styles.flex3}>
                            <TSText number={true}>Credit Card Processor</TSText>
                        </View>
                        <View style={styles.flex7}>
                            <View style={styles.row}>
                                <View style={styles.flex1}>
                                    <View style={[styles.row, styles.switchRowMargin]}>
                                        <Switch
                                            value={this.state.profile.ccp === Realm.PaymentType.SQUARE}
                                            onValueChange={this.handleUpdateCCP.bind(this, Realm.PaymentType.SQUARE)}/>
                                        <TSText fontNormal={true}>Square</TSText>
                                    </View>
                                </View>
                                <View style={styles.flex1}>
                                    <View style={[styles.row, styles.switchRowMargin]}>
                                        <Switch
                                            value={this.state.profile.ccp === Realm.PaymentType.PAYPAL}
                                            onValueChange={this.handleUpdateCCP.bind(this, Realm.PaymentType.PAYPAL)}/>
                                        <TSText fontNormal={true}>PayPal</TSText>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                    <TSTextInput label="*Email"
                                 value={this.state.profile.email}
                                 keyboardType="email-address"
                                 editable={false}
                                 onChangeText={this.handleTextChange.bind(this, "email")}/>
                    <TSTextInput label="v.zero Credentials" extra={this._paypalBtn}
                                 secureTextEntry={true}
                                 value={this.state.profile.paypal}
                                 onChangeText={this.handleTextChange.bind(this, "paypal")}/>
                    <TSTextInput label="Square API" extra={this._squareBtn}
                                 secureTextEntry={false}
                                 value={this.state.profile.sq_api}
                                 onChangeText={this.handleTextChange.bind(this, "sq_api")}/>
                    <TSTextInput label="Square Token" extra={this._squareBtn}
                                 secureTextEntry={true}
                                 value={this.state.profile.sq_token}
                                 onChangeText={this.handleTextChange.bind(this, "sq_token")}/>
                    <TSTextInput label="Website"
                                 value={this.state.profile.website}
                                 onChangeText={this.handleTextChange.bind(this, "website")}/>
                    <TSTextInput label="Twitter"
                                 value={this.state.profile.twitter}
                                 onChangeText={this.handleTextChange.bind(this, "twitter")}/>
                    <TSTextInput label="Facebook"
                                 value={this.state.profile.facebook}
                                 onChangeText={this.handleTextChange.bind(this, "facebook")}/>
                </KeyboardAwareScrollView>
                <View style={styles.row}>
                    <TSText fontNormal={false} fontSize="10" color="#FF0000">* indicate required fields</TSText>
                    <View style={styles.flex1}/>
                    <TSButtonPrimary label='Save & Publish Profile' onPress={this.publishProfile}/>
                </View>

            </View>
        );
    }
});

var styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 5,
        paddingTop: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flexStart: {
        alignItems: 'flex-start',
    },
    selfAlignTop: {
        alignSelf: 'flex-start',
    },
    imageMargin: {
        margin: 4,
    },
    switchMargin: {
        margin: 10,
    },
    switchRowMargin: {
        margin: 5,
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
    flex4: {
        flex: 4,
    },
    flex5: {
        flex: 5,
    },
    flex7: {
        flex: 7,
    },
    imageIcon: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        width: 210,
        height: 210,
        borderWidth: 1,
        borderColor: '#ECECEC',
    },
    image: {
        width: 210,
        height: 210,
    },
    marginBottom10: {
        marginBottom: 10,
    }
});

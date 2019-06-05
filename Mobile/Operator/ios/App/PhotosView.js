'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    CameraRoll,
    Image,
    InteractionManager,
    Platform,
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableHighlight,
} from 'react-native';

import groupByEveryN from 'react-native/Libraries/Utilities/groupByEveryN';
import TSHeader from 'shared-modules/TSHeader';
import TSText from 'shared-modules/TSText';
import Button from 'shared-modules/Button';

export default class extends Component {
    static propTypes = {
        /**
         * The group where the photos will be fetched from. Possible
         * values are 'Album', 'All', 'Event', 'Faces', 'Library', 'PhotoStream'
         * and SavedPhotos.
         */
        groupTypes: PropTypes.oneOf([
            'Album',
            'All',
            'Event',
            'Faces',
            'Library',
            'PhotoStream',
            'SavedPhotos',
        ]),

        /**
         * Number of images that will be fetched in one page.
         */
        batchSize: PropTypes.number,

        /**
         * A function that takes a single image as a parameter and renders it.
         */
        renderImage: PropTypes.func,

        /**
         * imagesPerRow: Number of images to be shown in each row.
         */
        imagesPerRow: PropTypes.number,

        /**
         * The asset type, one of 'Photos', 'Videos' or 'All'
         */
        assetType: PropTypes.oneOf(['Photos', 'Videos', 'All'])
    };

    initialState = {
        groupNames: {},
        images: [],
        selectedGroup: null,
        assets: [],
        //groupTypes: this.props.groupTypes,
        groupTypes: "SavedPhotos",
        lastCursor: null,
        assetType: "Photos",
        loadingMore: false,
    };

    constructor(props) {
        super(props);
        this.state = {
            groupNames: {},
            images: [],
            assets: [],
            groupTypes: this.props.groupTypes,
            lastCursor: null,
            assetType: this.props.assetType,
            noMore: false,
            loadingMore: false,
            batchSize: 12,
        }
    };

    componentDidMount() {
        InteractionManager.runAfterInteractions(() =>
            this.loadPhotosByGroup(this.state.groupType, this.state.images, this.state.lastCursor))
    };

    loadPhotosByGroup(type, images, lastCursor) {
        let fetchParams = {
            first: this.state.batchSize,
            groupTypes: type,
            assetType: "Photos",
            //groupName: name
        };
        if (Platform.OS === "android") {
            // not supported in android
            delete fetchParams.groupTypes;
        }

        if (lastCursor) {
            fetchParams.after = lastCursor;
        }

        CameraRoll.getPhotos(fetchParams)
            .then(data => {
                data.edges.forEach(edge => {
                    let node = edge.node;
                    images.push(node.image);
                });
                this.setState({
                    images: images,
                    //groupName: name,
                    groupType: type,
                    lastCursor: data.page_info.end_cursor,
                    nextPage: data.page_info.has_next_page
                });
            })
            .catch(e => console.log(e));
    }

    handleSelectPhoto(image) {
        this.props.onSelect(image);
        this.props.navigator.pop();
    }

    render() {
        let buttons = [{
            buttonPosition: "R",
            buttonText: "Cancel",
            onPress: () => {
                this.props.navigator.pop();
            }
        }];

        let nextButton;
        if (this.state.nextPage) {
            let {groupType, images, lastCursor} = this.state;
            nextButton =
                <Button onPress={() => this.loadPhotosByGroup(groupType, images, lastCursor)}>
                    <Text>More</Text>
                </Button>
        }

        return (
            <View style={styles.container}>
                <TSHeader headerTitle='Photos' buttons={buttons}/>
                <View style={styles.info}>
                    <ScrollView>
                        <View style={styles.imageGrid}>
                            {this.state.images.map((image, idx) => {
                                return (
                                    <View style={styles.imgBox} key={idx}>
                                        <Button onPress={this.handleSelectPhoto.bind(this, image)}>
                                            <Image style={styles.image} source={image}/>
                                        </Button>
                                    </View>
                                )
                            })}
                        </View>
                        {nextButton}
                    </ScrollView>
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
    },
    info: {
        flex: 1,
        flexDirection: 'row',
    },
    column: {
        flexDirection: 'column',
    },
    leftPanel: {
        margin: 4,
        padding: 5,
    },
    rightPanel: {
        flex: 1,
        margin: 4,
        padding: 5,
    },
    leftPanelGrid: {
        flexDirection: 'column',
        borderRightWidth: 1,
        borderRightColor: '#A9B1B9',
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        //justifyContent: 'center',
    },
    selectedBtn: {
        backgroundColor: '#A9B1B9',
    },
    url: {
        fontSize: 9,
        marginBottom: 14,
    },
    imageSmall: {
        width: 100,
        height: 100,
    },
    image: {
        width: 200,
        height: 200,
    },
    box: {
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
        width: 200,
        height: 200,
        borderBottomWidth: 1,
        borderBottomColor: '#A9B1B9',
    },
    imgBox: {
        margin: 5,
    },
});

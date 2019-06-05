'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import {
    StyleSheet,
    View
} from 'react-native';

import TSHeader from 'shared-modules/TSHeader';
import Messenger from 'shared-modules/Messenger';
import TSLongTextInput from 'shared-modules/TSLongTextInput';
import TSButtonPrimary from 'shared-modules/TSButtonPrimary';
import IconNames from 'shared-modules/IconNames';
import TSAds from './TSAds';

import Connector from './Connector';

const BANNER_HEIGHT = 50;

export default class extends Component {
    static propTypes = {
        truck: PropTypes.object,
    };

    constructor(props) {
        super(props);
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
                <TSHeader headerTitle={this.props.truck.name} buttons={buttons} hideConnection={true}/>
                <Messenger connector={Connector} remoteId={this.props.truck.operatorId}
                           remoteChannel={"operator"} extraHeight={BANNER_HEIGHT}/>
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
    bannerArea: {
        height: BANNER_HEIGHT,
    },
    marginTop10: {
        marginTop: 10,
    },
});

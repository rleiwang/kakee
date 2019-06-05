'use strict';

import React, {
    PropTypes,
} from 'react';

import {
    requireNativeComponent,
    View
} from 'react-native';

class TSAds extends React.Component {
    static propTypes = {
        /**
         * ad unit ID
         */
        adUnitID: PropTypes.string,

        ...View.propTypes
    };

    static defaultProps = {
        adUnitID: 'ca-app-pub-1206856503362862/8526590434'
    };

    render() {
        return <BannerAdsView style={this.props.style} adUnitID={this.props.adUnitID}/>;
    }
}

const BannerAdsView = requireNativeComponent('BannerAds', TSAds);

export default TSAds;

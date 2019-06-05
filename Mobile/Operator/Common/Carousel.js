'use strict';

import React from 'react';

import {
    Dimensions,
    StyleSheet,
    Text,
    View,
    TouchableHighlight,
} from 'react-native';

import TimerMixin from 'react-timer-mixin';

import CarouselPager from './CarouselPager';

import TSBadge from 'shared-modules/TSBadge';
import TSText from 'shared-modules/TSText';
import Button from 'shared-modules/Button';

var Carousel = React.createClass({
    mixins: [TimerMixin],

    getDefaultProps() {
        return {
            hideIndicators: false,
            indicatorColor: '#3B709F',
            indicatorSize: 50,
            inactiveIndicatorColor: '#999999',
            indicatorAtBottom: true,
            indicatorOffset: 250,
            width: null,
            initialPage: 0,
            indicatorSpace: 25,
            animate: true,
            delay: 100,
            loop: true,
        };
    },

    getInitialState() {
        return {
            activePage: this.props.initialPage > 0 ? this.props.initialPage : 0,
        };
    },

    getWidth() {
        if (this.props.width !== null) {
            return this.props.width;
        } else {
            return Dimensions.get('window').width;
        }
    },

    componentDidMount() {
        if (this.props.initialPage > 0) {
            this.refs.pager.scrollToPage(this.props.initialPage, false);
        }

        if (this.props.animate && this.props.children) {
            this._setUpTimer();
        }
    },

    indicatorPressed(activePage) {
        this.setState({activePage});
        this.refs.pager.scrollToPage(activePage);
    },

    renderPageIndicator() {
        if (this.props.hideIndicators === true) {
            return null;
        }

        var indicators = [],
            //indicatorStyle = this.props.indicatorAtBottom ? {bottom: this.props.indicatorOffset} : {top: this.props.indicatorOffset},
            style, position;

        /*position = {
            width: this.props.children.length * this.props.indicatorSpace,
        };
        position.left = (this.getWidth() - position.width) / 2;*/

        for (var i = 0, l = this.props.children.length; i < l; i++) {
            if (typeof this.props.children[i] === "undefined") {
                continue;
            }
            let label = this.props.children[i].props.label;
            let badge = this.props.children[i].props.badge;

            style = i === this.state.activePage ? { color: this.props.indicatorColor } : { color: this.props.inactiveIndicatorColor };
            let color = i == this.state.activePage? this.props.indicatorColor : this.props.inactiveIndicatorColor;

            indicators.push(
                <View style={styles.indicatorMargin} key={i}>
                    <Button style={styles.column} onPress={this.indicatorPressed.bind(this,i)}>
                        <View style={styles.indicator}>
                            <TSBadge color={color}>{badge}</TSBadge>
                            <TSText fontSize="12" fontNormal={true} color={color}>{label}</TSText>
                        </View>
                    </Button>
                </View>);
        }

        if (indicators.length === 1) {
            return null;
        }

        return (
            <View style={[styles.pageIndicator]}>
            {/*<View style={[styles.pageIndicator, position, indicatorStyle]}>*/}
                {indicators}
            </View>
        );
    },

    _setUpTimer() {
        if (this.props.children.length > 1) {
            this.clearTimeout(this.timer);
            this.timer = this.setTimeout(this._animateNextPage, this.props.delay);
        }
    },

    _animateNextPage() {
        var activePage = 0;
        if (this.state.activePage < this.props.children.length - 1) {
            activePage = this.state.activePage + 1;
        } else if (!this.props.loop) {
            return;
        }

        this.indicatorPressed(activePage);
        this._setUpTimer();
    },

    _onAnimationBegin() {
        this.clearTimeout(this.timer);
    },

    _onAnimationEnd(activePage) {
        activePage = Math.round(activePage);
        this.setState({activePage});
        if (this.props.onPageChange) {
            this.props.onPageChange(activePage);
        }
    },

    render() {
        return (
            <View style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                    <CarouselPager
                        ref="pager"
                        width={this.getWidth()}
                        contentContainerStyle={styles.container}
                        onBegin={this._onAnimationBegin}
                        onEnd={this._onAnimationEnd}
                    >
                        {this.props.children}
                    </CarouselPager>
                </View>

                {this.renderPageIndicator()}
            </View>
        );
    },

});

var styles = StyleSheet.create({
    container: {
        //flex: 1,
        justifyContent: 'center',
    },
    page: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    pageIndicator: {
        //position: 'absolute',
        flexDirection: 'row',
        //flex: 1,
        //justifyContent: 'space-around',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        backgroundColor: 'transparent',
        marginTop: 5,
        marginBottom: 10,
    },
    indicatorMargin: {
        marginRight: 15,
        marginLeft: 15,
    },
    indicator: {
        flexDirection: 'column',
        alignItems: 'center',
        //marginRight: 15,
        //marginLeft: 15,
    },
    column: {
        flexDirection: 'column',
    },
});

module.exports = Carousel;

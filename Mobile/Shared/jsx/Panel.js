'use strict';

import React, {
    Component,
    PropTypes,
} from 'react';

import {
    View,
    TouchableHighlight,
} from 'react-native';

import Collapsible from './Collapsible';

const COLLAPSIBLE_PROPS = Object.keys(Collapsible.propTypes);
const VIEW_PROPS = Object.keys(View.propTypes);

export default class extends Component {
    static propTypes = {
        onChange: PropTypes.func,
        align: PropTypes.oneOf(['top', 'center', 'bottom']),
        duration: PropTypes.number,
        initCollapsed: PropTypes.bool,
        easing: PropTypes.string,
        initiallyActiveSection: PropTypes.number,
        underlayColor: PropTypes.string,
    };

    static defaultProps = {
        underlayColor: '#A9B1B9',
    };

    constructor(props) {
        super(props);

        this.state = {
            collapsed: this.props.initCollapsed ? true : false,
        };
    }

    render() {
        let viewProps = {};
        let collapsibleProps = {};
        Object.keys(this.props).forEach((key) => {
            if (COLLAPSIBLE_PROPS.indexOf(key) !== -1) {
                collapsibleProps[key] = this.props[key];
            } else if (VIEW_PROPS.indexOf(key) !== -1) {
                viewProps[key] = this.props[key];
            }
        });

        return (
            <View {...viewProps}>
                <TouchableHighlight onPress={() => this.setState({collapsed: !this.state.collapsed})}
                                    underlayColor={this.props.underlayColor}>
                    {this.props.children[0]}
                </TouchableHighlight>
                {this.props.children[1] &&
                <Collapsible collapsed={this.state.collapsed} {...collapsibleProps}>
                    {this.props.children[1]}
                </Collapsible>
                }
            </View>
        );
    }
}

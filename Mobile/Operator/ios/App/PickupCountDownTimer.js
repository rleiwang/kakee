'use strict';

import React, {
    Component,
    PropTypes
} from 'react';

import TSText from 'shared-modules/TSText';

export default class extends Component {
    static propTypes = {
        onChange: PropTypes.func,
        onPrint: PropTypes.func,
        onShowOrder: PropTypes.func,
        order: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            minutesRemaining: this._minutesRemaining(this._millisRemaining(props.order))
        }
    }

    componentDidMount() {
        this._setTimer();
    }

    componentWillUnmount() {
        this._clearTimer();
    }

    render() {
        return (
            <TSText fontNormal={true} color="#FF0000">
                {this._toTimeString(this.props.order.pickupTime)}
            </TSText>
        );
    }

    _setTimer() {
        this._clearTimer();
        const millis = this._millisRemaining(this.props.order);
        if (millis > 0) {
            this.setState({minutesRemaining: this._minutesRemaining(millis)},
                () => {
                    this._tf = setTimeout(this._setTimer.bind(this), millis % 60000);
                });
        } else {
            this.setState({minutesRemaining: 0});
        }
    }

    _clearTimer() {
        if (this._tf) {
            clearTimeout(this._tf);
            delete this._tf;
        }
    }

    _minutesRemaining(millis) {
        return Math.floor((millis + 59999) / 60000);
    }

    _millisRemaining(order) {
        if (order.pickupTime > 0) {
            const remaining = order.pickupTime - Date.now();
            if (remaining > 0) {
                return remaining;
            }
        }
        return 0;
    }

    _toTimeString(pickupTime) {
        if (this.state.minutesRemaining > 0) {
            return `Pickup in ${this.state.minutesRemaining} minutes`;
        }

        const d = new Date(pickupTime);
        const min = d.getMinutes();
        const padding = min < 10 ? '0' : '';
        const hr = ((d.getHours() + 11) % 12 + 1);
        const ap = d.getHours() > 11 ? 'pm' : 'am';

        return `Pickup after ${hr}:${padding}${min} ${ap}`;
    }
}

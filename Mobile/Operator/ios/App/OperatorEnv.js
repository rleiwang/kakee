'use strict';

class ENV {
    set isPayPalEnabled(enabled) {
        this._paypal = enabled;
    }

    get isPayPalEnabled() {
        return this._paypal ? this._paypal : false;
    }
}

export default new ENV();

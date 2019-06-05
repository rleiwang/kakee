'use strict';

import Postal from 'postal';

import DeviceInfo from 'shared-modules/DeviceInfo';
import Connector from 'shared-modules/Connector';

class UserConnector extends Connector {
    constructor() {
        Postal.channel("external").subscribe("Connected",
            () => this.send({
                topic: 'Authentication',
                userId: DeviceInfo.info().uniqueID,
                password: ''
            }));
        super("users");
    }
}

export default new UserConnector()

'use strict';

import DeviceInfo from 'react-native-device-info';

class UserDeviceInfo {
    info() {
        if (this._info) {
            return this._info;
        }

        this._info = {
            uniqueID: DeviceInfo.getUniqueID(),
            instanceID: DeviceInfo.getInstanceID(),
            deviceID: DeviceInfo.getDeviceId(),
            manufacturer: DeviceInfo.getManufacturer(),
            model: DeviceInfo.getModel(),
            brand: DeviceInfo.getBrand(),
            systemName: DeviceInfo.getSystemName(),
            systemVersion: DeviceInfo.getSystemVersion(),
            bundleID: DeviceInfo.getBundleId(),
            buildNumber: DeviceInfo.getBuildNumber(),
            version: DeviceInfo.getVersion(),
            readableVersion: DeviceInfo.getReadableVersion(),
            deviceName: DeviceInfo.getDeviceName(),
            userAgent: DeviceInfo.getUserAgent(),
            locale: DeviceInfo.getDeviceLocale(),
            tzOffsetHours: new Date().getTimezoneOffset() / 60,
            country: DeviceInfo.getDeviceCountry()
        };

        return this._info;
    }
}

export default new UserDeviceInfo();

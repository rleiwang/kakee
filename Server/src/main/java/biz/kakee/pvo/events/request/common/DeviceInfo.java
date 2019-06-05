package biz.kakee.pvo.events.request.common;

import lombok.Getter;
import lombok.ToString;

@ToString
public class DeviceInfo {
    @Getter
    private String uniqueID;

    @Getter
    private String instanceID;

    @Getter
    private String deviceID;

    @Getter
    private String manufacturer;

    @Getter
    private String model;

    @Getter
    private String brand;

    @Getter
    private String systemName;

    @Getter
    private String systemVersion;

    @Getter
    private String bundleID;

    @Getter
    private String buildNumber;

    @Getter
    private String version;

    @Getter
    private String readableVersion;

    @Getter
    private String deviceName;

    @Getter
    private String userAgent;

    @Getter
    private String locale;

    @Getter
    private int tzOffsetHours;

    @Getter
    private String country;
}

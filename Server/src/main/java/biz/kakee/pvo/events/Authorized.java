package biz.kakee.pvo.events;

import biz.kakee.pvo.geo.GeoLocation;
import lombok.Builder;
import lombok.Data;

import javax.websocket.Session;

@Data
@Builder
public class Authorized {
    private final GeoLocation geoLocation;
    private final String remote;
    private final Session session;
    private final Identity src;
    private final String deviceId;
}

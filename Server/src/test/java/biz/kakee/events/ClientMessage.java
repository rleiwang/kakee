package biz.kakee.events;

import biz.kakee.pvo.geo.GeoLocation;
import lombok.Data;

@Data
public class ClientMessage {
    private String token;
    private long sequence;
    private String installID;
    private GeoLocation geoLocation;
}

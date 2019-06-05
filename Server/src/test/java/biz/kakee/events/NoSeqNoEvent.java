package biz.kakee.events;

import biz.kakee.pvo.geo.GeoLocation;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NoSeqNoEvent {
    private GeoLocation location;
}

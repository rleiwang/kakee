package biz.kakee.pvo.geo;

import com.datastax.driver.mapping.annotations.UDT;
import lombok.Data;

@UDT(keyspace = "kakee", name = "coordinate")
@Data
public class Coordinate {
    private GeoLocation location;
    private long unixTime;
}

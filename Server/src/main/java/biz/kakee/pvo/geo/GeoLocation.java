package biz.kakee.pvo.geo;

import com.datastax.driver.mapping.annotations.UDT;
import lombok.Data;

@UDT(keyspace = "kakee", name = "geolocation")
@Data
public class GeoLocation {
    private float latitude;
    private float longitude;
}

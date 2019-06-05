package biz.kakee.pvo.geo;

import com.datastax.driver.mapping.annotations.UDT;
import lombok.Data;

@UDT(keyspace = "kakee", name = "region")
@Data
public class Region {
    private DMS latitude;
    private DMS longitude;
}

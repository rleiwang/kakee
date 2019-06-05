package biz.kakee.pvo.geo;

import com.datastax.driver.mapping.annotations.UDT;
import lombok.Data;

/**
 * Degress, Minutes, Seconds
 */
@UDT(keyspace = "kakee", name = "dms")
@Data
public class DMS {
    private int degrees;
    private int minutes;
    private int seconds;
}

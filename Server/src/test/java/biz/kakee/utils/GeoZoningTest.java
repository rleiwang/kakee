package biz.kakee.utils;

import biz.kakee.db.Cassandra;
import biz.kakee.pvo.geo.GeoLocation;
import biz.kakee.pvo.geo.Region;
import com.datastax.driver.core.PreparedStatement;
import org.junit.Test;

public class GeoZoningTest {

    @Test
    public void testMapToRegion() throws Exception {
        GeoLocation location = new GeoLocation();
        location.setLatitude(37.784732f);
        location.setLongitude(-122.427891f);

        Region region = GeoZoning.mapToRegion(location);
        Cassandra cassandra = new Cassandra("127.0.0.1", "kakee");
        PreparedStatement stmt = cassandra.getSession()
                .prepare("INSERT INTO Zone (region, logtime, status) VALUES (?, now(), ?)");

        cassandra.getSession().execute(stmt.bind(region, "at"));

        System.out.println();
    }
}
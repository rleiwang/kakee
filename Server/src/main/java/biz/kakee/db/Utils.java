package biz.kakee.db;

import com.datastax.driver.core.Row;
import com.datastax.driver.core.Session;

import java.util.UUID;

public class Utils {
    public static UUID getCurrentTimeUUID(final Session session) {
        for (Row row : session.execute("select now() from system.local")) {
            return row.getUUID(0);
        }
        throw new IllegalStateException("Can't get timeUUID from cassandra");
    }
}

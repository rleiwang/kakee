package biz.kakee.pvo.events;

import com.datastax.driver.mapping.annotations.UDT;
import lombok.Data;

import java.time.Instant;

@UDT(keyspace = "kakee", name = "event")
@Data
public class JournalEvent {
    private String type;
    private String msg;
    private Instant ts;
}

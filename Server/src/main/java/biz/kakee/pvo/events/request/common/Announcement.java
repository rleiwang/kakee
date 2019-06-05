package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class Announcement extends WebSocketMessage {
    public enum Status {
        NEW,
        DELETE,
        QUERY,
        UPDATE
    }

    private String id;
    private Status status;
    private String msg;
}

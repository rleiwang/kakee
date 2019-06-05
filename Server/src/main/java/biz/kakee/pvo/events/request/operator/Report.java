package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class Report extends WebSocketMessage {
    public enum Type {
        Sales,
        History,
        Customer
    }

    private long after;
    private long before;
    private Type type;
    private String customerId;
}

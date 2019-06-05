package biz.kakee.pvo.events.request.user;

import biz.kakee.pvo.events.OrderRecord;
import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;
import java.util.Map;

@Data
@EqualsAndHashCode(callSuper = true)
public class OrderHistory extends WebSocketMessage {
    private String scrollId;
    private List<OrderRecord> records;
    private Map<String, Map<String, Object>> operators;
}

package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class SiteOrderStatus extends WebSocketMessage {
    private final long seqId;
    private final String orderId;
    private final OrderStatus.Status status;
}

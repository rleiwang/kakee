package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@JsonIgnoreProperties(ignoreUnknown = true, allowGetters = true)
public class OrderStatus extends WebSocketMessage {
    // Closed/Received are used in oc_order_counters
    public enum Status {
        Closed,
        OperatorOffline,
        Open,
        Ready,
        Received,
        Rejected,
        Sent,
        Canceled,
        Pending
    }

    private final String orderId;
    private final String orderNum;
    private final String refCode;
    private final Status status;
    private final long expiry;
    private final int pending;
    private final long seqId;

    {
        super.setTopic(OrderStatus.class.getSimpleName());
    }
}

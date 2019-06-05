package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@JsonIgnoreProperties(ignoreUnknown = true, allowGetters = true)
public class OrderPaid extends WebSocketMessage {
    private final long seqId;
    private final String orderId;
    private final String payments;

    {
        super.setTopic(OrderPaid.class.getSimpleName());
    }
}

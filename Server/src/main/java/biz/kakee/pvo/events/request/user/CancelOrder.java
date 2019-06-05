package biz.kakee.pvo.events.request.user;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class CancelOrder extends WebSocketMessage {
    private final String orderId;

    {
        setTopic(CancelOrder.class.getSimpleName());
    }
}

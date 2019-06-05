package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class CancelOrderError extends WebSocketMessage {
    private final String orderId;

    {
        setTopic(CancelOrderError.class.getSimpleName());
    }
}

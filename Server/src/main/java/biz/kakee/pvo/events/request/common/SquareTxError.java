package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class SquareTxError extends WebSocketMessage {
    public enum Code {
        Operator,
        Server
    }

    private final String topic = SquareTxError.class.getSimpleName();
    private final String orderId;
    private final Code code;
    private final String error;
}

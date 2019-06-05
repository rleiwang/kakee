package biz.kakee.pvo.events.request.operator.payments;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class PaypalClientToken extends WebSocketMessage {
    private String token;
}

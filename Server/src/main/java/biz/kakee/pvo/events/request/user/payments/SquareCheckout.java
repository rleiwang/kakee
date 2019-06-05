package biz.kakee.pvo.events.request.user.payments;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class SquareCheckout extends WebSocketMessage {
    private String amount;
    private String nonce;
    private String orderId;
}

package biz.kakee.pvo.events.request.user.payments;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class PaypalCheckout extends WebSocketMessage {
    private String accessCode;
    private String amount;
    private String status;
    private String nonce;
    private String orderId;
    private String operatorId;
}

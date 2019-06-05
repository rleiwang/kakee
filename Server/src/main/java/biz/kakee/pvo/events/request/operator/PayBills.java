package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class PayBills extends WebSocketMessage {
    private final String amount;
    private final String nonce;
    private final String billId;
    private final String invoice;
    private final String desc;
}

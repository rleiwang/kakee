package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class PaypalValidation extends WebSocketMessage {
    private String validationURL;
}

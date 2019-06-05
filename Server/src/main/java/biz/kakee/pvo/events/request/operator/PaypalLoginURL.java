package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class PaypalLoginURL extends WebSocketMessage {
    private String validateURL;
    private String loginURL;
}

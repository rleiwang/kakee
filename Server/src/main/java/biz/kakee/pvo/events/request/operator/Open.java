package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class Open extends WebSocketMessage {
    private String city;
    private String paypal;
    private String square;
    private float taxRate;
    private int pending;
}

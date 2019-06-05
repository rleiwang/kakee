package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class MyOrder extends WebSocketMessage {
    private String orderId;
    private int position;
}

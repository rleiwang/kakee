package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class PendingOrders extends WebSocketMessage {
    private int pending;
}

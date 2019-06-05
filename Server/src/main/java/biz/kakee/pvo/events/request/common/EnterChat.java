package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class EnterChat extends WebSocketMessage {
    private String name;
}

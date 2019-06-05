package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class NewMessage extends WebSocketMessage {
    private String msg;
    private String refId;
}

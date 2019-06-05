package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class GcmToken extends WebSocketMessage {
    private String token;
    private String platform;
}

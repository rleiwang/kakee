package biz.kakee.pvo.events.request.user;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

import java.util.function.Consumer;

@Data
public class Authentication extends WebSocketMessage {
    private String userId;
    private String password;

    private Consumer<Boolean> onAuthorize;
}

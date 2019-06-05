package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import java.util.function.Consumer;

@Data
public class ResetPasscode extends WebSocketMessage {
    private final String operatorId;
    private final String verificationCode;
    private final String passCode;

    @JsonIgnore
    private Consumer<Boolean> onAuthorized;
}

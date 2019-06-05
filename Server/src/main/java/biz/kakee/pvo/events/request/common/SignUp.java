package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.function.Consumer;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SignUp extends WebSocketMessage {
    private final String email;
    private final String password;
    private final String phoneNumber;
    private final String verificationCode;
    private final String operatorId;
    private final String name;
    private final String promotionCode;

    @JsonIgnore
    private Consumer<Boolean> onAuthorized;
}

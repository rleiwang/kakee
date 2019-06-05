package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.NoAuth;
import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.ToString;

@ToString
@JsonIgnoreProperties(ignoreUnknown = true)
public class SendVerificationCode extends WebSocketMessage implements NoAuth {

    @Getter
    private String email;
}

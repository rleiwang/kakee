package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.NoAuth;
import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class SignUpEmail extends WebSocketMessage implements NoAuth {
    private final String operatorId;
}

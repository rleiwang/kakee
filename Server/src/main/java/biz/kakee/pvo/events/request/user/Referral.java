package biz.kakee.pvo.events.request.user;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class Referral extends WebSocketMessage {
    private final String operatorEmail;
    private final String userEmail;
}

package biz.kakee.pvo.events.request.user.payments;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class UTSQPaypalToken extends WebSocketMessage {
    private String operatorId;
}

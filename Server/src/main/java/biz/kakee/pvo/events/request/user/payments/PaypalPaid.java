package biz.kakee.pvo.events.request.user.payments;

import biz.kakee.pvo.events.Channel;
import biz.kakee.pvo.events.Identity;
import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class PaypalPaid extends WebSocketMessage {

    private String orderId;
    private String payments;

    public PaypalPaid(String operatorId)
    {
        dest = new Identity(operatorId, Channel.operator);
        setTopic(PaypalPaid.class.getSimpleName());
    }
}

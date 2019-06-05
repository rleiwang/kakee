package biz.kakee.events;

import biz.kakee.pvo.events.Identity;
import biz.kakee.pvo.events.request.user.MobileOrder;
import lombok.Data;

@Data
public class ClientOrder extends ClientMessage {
    private final String topic = MobileOrder.class.getSimpleName();

    private Identity dest;
    private String refCode;
}

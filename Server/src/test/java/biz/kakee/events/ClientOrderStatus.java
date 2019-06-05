package biz.kakee.events;

import biz.kakee.pvo.events.Identity;
import biz.kakee.pvo.events.request.operator.OrderStatus;
import lombok.Data;

@Data
public class ClientOrderStatus extends ClientMessage {
    private final String topic = OrderStatus.class.getSimpleName();

    private Identity dest;
}

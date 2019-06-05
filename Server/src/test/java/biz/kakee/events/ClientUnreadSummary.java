package biz.kakee.events;

import biz.kakee.pvo.events.request.common.UnreadSummary;
import lombok.Data;

@Data
public class ClientUnreadSummary extends ClientMessage {
    private final String topic = UnreadSummary.class.getSimpleName();
}

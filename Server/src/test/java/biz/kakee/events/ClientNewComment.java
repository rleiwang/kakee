package biz.kakee.events;

import biz.kakee.pvo.events.request.common.NewMessage;
import lombok.Data;

@Data
public class ClientNewComment extends ClientMessage {
    private final String topic = NewMessage.class.getSimpleName();
    private String recipientId;
    private String msg;
}

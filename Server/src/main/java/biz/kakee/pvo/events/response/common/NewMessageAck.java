package biz.kakee.pvo.events.response.common;

import lombok.Data;

@Data
public class NewMessageAck {
    private final String topic = NewMessageAck.class.getSimpleName();
    private final String refId;
    private final String msgId;
}

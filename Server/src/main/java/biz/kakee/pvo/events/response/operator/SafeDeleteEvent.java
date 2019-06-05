package biz.kakee.pvo.events.response.operator;

import lombok.Data;

@Data
public class SafeDeleteEvent {
    private final String topic = SafeDeleteEvent.class.getSimpleName();
    private final long seqId;
}

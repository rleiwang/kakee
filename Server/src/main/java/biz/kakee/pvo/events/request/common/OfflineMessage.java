package biz.kakee.pvo.events.request.common;

import lombok.Data;

@Data
public class OfflineMessage {
    private final String uid;
    private final String topic;
    private final long expiry;
    private final Object message;
}

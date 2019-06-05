package biz.kakee.pvo.events;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OnlineMember {
    private String mid;
    private String role;
    private float latitude;
    private float longitude;
    private final String channel;
    private final int streamId;
    private final String chat;
    private final String paypalAccessCode;
    private final String squareAppId;
}

package biz.kakee.pvo.events.response.common;

import lombok.Data;

@Data
public class MemberOffline {
    private final String topic = MemberOffline.class.getSimpleName();
    private final String mid;
}

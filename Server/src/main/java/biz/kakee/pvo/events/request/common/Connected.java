package biz.kakee.pvo.events.request.common;

import lombok.Data;

@Data
public class Connected {
    private final String topic = Connected.class.getSimpleName();
}

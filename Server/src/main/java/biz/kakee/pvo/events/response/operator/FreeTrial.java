package biz.kakee.pvo.events.response.operator;

import lombok.Data;

@Data
public class FreeTrial {
    private final String topic = FreeTrial.class.getSimpleName();

    private final long daysLeft;
}

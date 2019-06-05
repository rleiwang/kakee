package biz.kakee.pvo.events.response.operator;

import lombok.Data;

@Data
public class Logout {
    private final String topic = Logout.class.getSimpleName();
}

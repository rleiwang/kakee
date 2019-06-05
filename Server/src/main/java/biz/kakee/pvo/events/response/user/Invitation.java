package biz.kakee.pvo.events.response.user;

import lombok.Data;

@Data
public class Invitation {
    private final String topic = Invitation.class.getSimpleName();
    private final boolean sent;
    private final int status;
}

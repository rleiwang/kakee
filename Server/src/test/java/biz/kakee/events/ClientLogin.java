package biz.kakee.events;

import biz.kakee.pvo.events.request.common.MyLogin;
import lombok.Data;

@Data
public class ClientLogin extends ClientMessage {
    private final String topic = MyLogin.class.getSimpleName();
}

package biz.kakee.events;

import biz.kakee.pvo.events.request.operator.Menu;
import lombok.Data;

@Data
public class ClientMenu extends ClientMessage {
    private String topic = Menu.class.getSimpleName();

    private String version;
    private String menu;
}

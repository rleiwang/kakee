package biz.kakee.pvo.events.request.operator;


import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class Menu extends WebSocketMessage {
    private String version;
    private String menu;
}

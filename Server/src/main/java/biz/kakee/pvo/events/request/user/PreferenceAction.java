package biz.kakee.pvo.events.request.user;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

@Data
public class PreferenceAction extends WebSocketMessage {
    public enum Type {
        FAVORITE,
        TRYOUT
    }

    private String operatorId;
    private Type type;
    private boolean add;
}

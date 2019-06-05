package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.ArrayList;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
public class UnreadSummary extends WebSocketMessage {

    @Data
    public static class Unread {
        private String id;
        private String name = "new customer";
        private long unread;
    }

    private List<Unread> unread = new ArrayList<>();
}

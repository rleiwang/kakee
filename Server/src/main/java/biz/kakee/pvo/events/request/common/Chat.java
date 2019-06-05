package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class Chat extends WebSocketMessage {
    // message position, in a chat window, right -> myself, left -> others
    public enum Position {
        right, left
    }

    @Data
    public static class Message {
        private String msgId;
        private long ts;
        private Position pos;
        private String text;
    }

    private List<Message> chats = new ArrayList<>();

    {
        setTopic(Chat.class.getSimpleName());
    }
}

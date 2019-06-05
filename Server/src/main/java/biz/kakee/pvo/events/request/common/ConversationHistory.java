package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ConversationHistory extends WebSocketMessage {
    private String senderId;
    private String scrollId;
    private List<Chat.Message> dialogues = new ArrayList<>();
}

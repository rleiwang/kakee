package biz.kakee.events;

import biz.kakee.pvo.events.request.common.ConversationHistory;
import lombok.Data;

@Data
public class ClientLoadConversation extends ClientMessage {
    private final String topic = ConversationHistory.class.getSimpleName();
    private String senderId;
}

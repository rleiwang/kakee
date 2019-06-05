package biz.kakee.handlers.common;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.OnlineMember;
import biz.kakee.pvo.events.WebSocketMessage;
import biz.kakee.pvo.events.request.common.Chat;
import biz.kakee.pvo.events.request.common.EnterChat;
import biz.kakee.pvo.events.request.common.ExitChat;
import biz.kakee.pvo.events.request.common.NewMessage;
import biz.kakee.pvo.events.response.common.NewMessageAck;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.SimpleStatement;
import com.datastax.driver.core.querybuilder.QueryBuilder;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.BiFunction;
import java.util.function.Function;

import static biz.kakee.aeron.EmbeddedAeron.sendUniCast;

@Slf4j
public class ChatEventHandler extends CassandraEventHandler {
    private final PreparedStatement insertComment;
    private final PreparedStatement onlineMember;
    private final PreparedStatement updateBookmark;
    private final PreparedStatement enterChatRoom;
    private final PreparedStatement exitChatRoom;

    public ChatEventHandler(Session session) {
        super(session);

        insertComment = session.prepare(QueryBuilder.batch()
                .add(new SimpleStatement("INSERT INTO dialogues (msgId, senderId, recipientId, msg) VALUES " +
                        "(:msgId, :senderId, :recipientId, :msg)"))
                .add(new SimpleStatement("INSERT INTO conversations (mid, remoteId, msgId, self) VALUES " +
                        "(:recipientId, :senderId, :msgId, false)"))
                .add(new SimpleStatement("INSERT INTO conversations (mid, remoteId, msgId, self) VALUES " +
                        ("(:senderId, :recipientId, :msgId, true)")))
                .add(new SimpleStatement("UPDATE conversation_bookmark SET last_msg = :msgId WHERE mid = " +
                        ":recipientId AND remoteId = :senderId"))
        );

        onlineMember = this.session.prepare("SELECT * FROM online_members WHERE mid = :mid");

        updateBookmark = this.session.prepare("UPDATE conversation_bookmark SET last_read = :msgId WHERE mid = " +
                ":recipientId AND remoteId = :senderId IF last_read < :msgId");

        enterChatRoom = this.session.prepare("UPDATE online_members SET chat = :chat WHERE mid = :mid IF EXISTS");

        exitChatRoom = this.session.prepare("DELETE chat FROM online_members WHERE mid = :mid IF chat = :chat");
    }

    /**
     * This is incoming message
     *
     * @param comment
     */
    @Subscribe
    @AllowConcurrentEvents
    public void onNewMessage(final NewMessage comment) {
        getTimeUUID()
                .thenCompose(insertNewMessage(comment))
                .thenCompose(sendAck(comment))
                .thenCombine(searchOnlineMember(comment), sendChat(comment))
                .whenComplete((pos, exp) -> {
                    if (exp != null) {
                        log.error("unable to insert " + comment, exp);
                    }
                });
    }

    /**
     * This is outgoing Chat, update bookmark after sent through WebSocket
     *
     * @param chat
     */
    @Subscribe
    @AllowConcurrentEvents
    public void onChat(final Chat chat) {
        if (chat.getChats().size() > 0) {
            String msgId = chat.getChats().get(chat.getChats().size() - 1).getMsgId();
            execAsync(() -> updateBookmark.bind()
                    .set("recipientId", chat.getDest().getId(), String.class)
                    .set("senderId", chat.getSrc().getId(), String.class)
                    .set("msgId", UUID.fromString(msgId), UUID.class))
                    .whenComplete((rs, exp) -> {
                        if (exp != null) {
                            log.error("unable to save bookmark " + chat, exp);
                        }
                    });
        }
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onEnterChat(final EnterChat enterChat) {
        chatRoom(enterChatRoom, enterChat);
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onExitChat(final ExitChat exitChat) {
        chatRoom(exitChatRoom, exitChat);
    }

    private BiFunction<Chat.Message, Optional<OnlineMember>, CompletableFuture<Long>> sendChat(NewMessage comment) {
        return (msg, member) -> {
            if (member.isPresent()) {
                OnlineMember onlineMember = member.get();
                Chat chat = new Chat();
                chat.merge(comment);
                chat.getChats().add(msg);
                return sendUniCast(onlineMember.getChannel(), onlineMember.getStreamId(), chat, null, true);
            }
            return CompletableFuture.completedFuture(0L);
        };
    }

    private CompletableFuture<Optional<OnlineMember>> searchOnlineMember(NewMessage comment) {
        return execAsync(() -> onlineMember.bind()
                .set("mid", comment.getDest().getId(), String.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream().findFirst()
                                .filter(r -> isChatInSession(comment, r.getString("chat")))
                                .map(mapToOnlineMember())
                ));
    }

    private boolean isChatInSession(NewMessage comment, String chatId) {
        return StringUtils.isNotEmpty(chatId) && chatId.equals(comment.getSrc().getId());
    }

    private Function<UUID, CompletionStage<Chat.Message>> insertNewMessage(NewMessage comment) {
        return uuid -> execAsync(() -> insertComment.bind()
                .set("msgId", uuid, UUID.class)
                .set("recipientId", comment.getDest().getId(), String.class)
                .set("senderId", comment.getSrc().getId(), String.class)
                .set("msg", comment.getMsg(), String.class))
                .thenCompose(rs -> {
                    Chat.Message message = new Chat.Message();
                    message.setMsgId(uuid.toString());
                    message.setPos(Chat.Position.left);
                    message.setText(comment.getMsg());
                    return CompletableFuture.completedFuture(message);
                });
    }

    private Function<Chat.Message, CompletionStage<Chat.Message>> sendAck(NewMessage comment) {
        return msg -> {
            Utils.replyObjectMsg(comment.getSession(), new NewMessageAck(comment.getRefId(), msg.getMsgId()));
            return CompletableFuture.completedFuture(msg);
        };
    }

    // enter/exit chat room, it means src.id receive messages from dest.id
    private void chatRoom(PreparedStatement stmt, WebSocketMessage chat) {
        execAsync(() -> stmt.bind()
                .set("mid", chat.getSrc().getId(), String.class)
                .set("chat", chat.getDest().getId(), String.class))
                .whenComplete((rs, exp) -> {
                    if (exp != null) {
                        log.error("unable to enter/exit" + chat, exp);
                    }
                });
    }
}

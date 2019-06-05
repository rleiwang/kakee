package biz.kakee.handlers.common;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.Channel;
import biz.kakee.pvo.events.request.common.Chat;
import biz.kakee.pvo.events.request.common.ConversationHistory;
import biz.kakee.pvo.events.request.common.UnreadSummary;
import biz.kakee.pvo.events.request.operator.OrderStatus;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Row;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.utils.UUIDs;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.Collectors;

import static biz.kakee.pvo.events.request.operator.OrderStatus.Status.Canceled;
import static biz.kakee.pvo.events.request.operator.OrderStatus.Status.Open;
import static java.util.stream.Collectors.toMap;

@Slf4j
public class DialogueEventHandler extends CassandraEventHandler {
    public static final String UNREAD_NAME = "customer purchased %d orders";
    private final PreparedStatement selectBookmark;
    private final PreparedStatement updateBookmark;
    private final PreparedStatement selNewMsg;
    private final PreparedStatement selProfName;
    private final PreparedStatement selCustOrdCnt;
    private final PreparedStatement selConversationHistory;
    private final PreparedStatement selDialogues;

    private static final int LIMIT = 10;

    public DialogueEventHandler(Session session) {
        super(session);

        selProfName = session.prepare("SELECT operatorId, name FROM profiles WHERE operatorId IN :ids");

        selCustOrdCnt = session.prepare("SELECT * FROM pair_order_counters WHERE operatorId = :operatorId AND " +
                "customerId in :ids");

        selectBookmark = session.prepare("SELECT * FROM conversation_bookmark WHERE mid = :meId");

        updateBookmark = session.prepare("UPDATE conversation_bookmark SET last_read = :now WHERE " +
                "mid = :meId AND remoteId = :remoteId IF EXISTS");

        selNewMsg = session.prepare("SELECT * FROM conversations WHERE mid = :meId AND remoteId = :remoteId " +
                "AND msgId > :last AND self = false ALLOW FILTERING");

        selConversationHistory = session.prepare("SELECT * FROM conversations WHERE mid = :meId AND " +
                "remoteId = :remoteId AND msgId < :cursor ORDER BY msgId DESC LIMIT " + LIMIT);

        selDialogues = session.prepare("SELECT msgId, msg FROM dialogues WHERE msgId IN :ids");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onConversationHistory(final ConversationHistory request) {
        String meId = request.getSrc().getId();
        String senderId = request.getSenderId();
        String scrollId = request.getScrollId();
        getCursor(scrollId)
                .thenCompose(uuid -> loadConversations(uuid, meId, senderId)
                        .thenCombine(updateLastRead(meId, getCursor(scrollId, uuid), senderId),
                                (lc, rs) -> lc))
                .thenCompose(fillDialogues())
                .whenComplete((conversation, exp) -> {
                    if (exp != null) {
                        log.error("unable to retrieve conversation " + request, exp);
                    } else {
                        conversation.setTopic(ConversationHistory.class.getSimpleName());
                        Utils.replyObjectMsg(request.getSession(), conversation);
                    }
                });
    }

    // if scrollId is null, it is first try to load, we would need to update the cursor
    private UUID getCursor(String scrollId, UUID cursor) {
        return scrollId == null ? cursor : null;
    }

    private CompletableFuture<UUID> getCursor(String scrollId) {
        return scrollId == null ? getTimeUUID() :
                CompletableFuture.completedFuture(UUID.fromString(scrollId));
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onUnreadSummary(final UnreadSummary unread) {
        String meId = unread.getSrc().getId();
        retrieveLastReadCursor(meId)
                .thenCompose(lastReads -> retrieveUnreadMessages(meId, lastReads))
                .thenCompose(newmsgs -> setUnreadName(unread, newmsgs))
                .whenComplete((newmsgs, exp) -> {
                    if (exp != null) {
                        log.error("unable to retrieve " + unread, exp);
                    } else {
                        unread.setTopic(UnreadSummary.class.getSimpleName());
                        unread.setUnread(new ArrayList<>(newmsgs.values()));
                        Utils.replyObjectMsg(unread.getSession(), unread);
                    }
                });
    }

    private CompletableFuture<Map<String, UUID>> retrieveLastReadCursor(String meId) {
        return execAsync(() -> selectBookmark.bind().set("meId", meId, String.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream()
                                .reduce(new HashMap<String, UUID>(),
                                        (map, row) -> {
                                            UUID lastRead = row.getUUID("last_read");
                                            if (lastRead == null) {
                                                lastRead = UUIDs.endOf(0);
                                            }
                                            map.put(row.getString("remoteId"), lastRead);
                                            return map;
                                        },
                                        (left, right) -> left)
                        )
                );
    }

    // update last read cursor
    private CompletableFuture<ResultSet> updateLastRead(String meid, UUID lastRead, String remoteId) {
        return lastRead == null ? CompletableFuture.completedFuture(null) :
                execAsync(() -> updateBookmark.bind()
                        .set("meId", meid, String.class)
                        .set("now", lastRead, UUID.class)
                        .set("remoteId", remoteId, String.class));
    }

    private CompletableFuture<Map<String, UnreadSummary.Unread>>
    retrieveUnreadMessages(String meId, Map<String, UUID> lastReads) {
        return lastReads.entrySet().stream()
                .reduce(CompletableFuture.completedFuture(new HashMap<String, UnreadSummary.Unread>()),
                        (future, entry) -> searchUnreadMsgForEach(future, entry, meId),
                        (left, right) -> left);
    }

    private CompletableFuture<Map<String, UnreadSummary.Unread>>
    searchUnreadMsgForEach(CompletableFuture<Map<String, UnreadSummary.Unread>> future,
                           Map.Entry<String, UUID> entry, String meId) {
        return future.thenCombine(execAsync(() -> selNewMsg.bind()
                        .set("meId", meId, String.class)
                        .set("remoteId", entry.getKey(), String.class)
                        .set("last", entry.getValue(), UUID.class)),
                (map, rs) -> {
                    UnreadSummary.Unread msg = new UnreadSummary.Unread();
                    msg.setId(entry.getKey());
                    msg.setUnread(rs.all().size());
                    map.put(entry.getKey(), msg);
                    return map;
                });
    }

    private CompletableFuture<Map<String, UnreadSummary.Unread>>
    setUnreadName(UnreadSummary unreadSummary, Map<String, UnreadSummary.Unread> msgMap) {
        return unreadSummary.getSrc().getChannel() == Channel.operator ?
                setCustomerName(unreadSummary, msgMap) : setOperatorName(msgMap);
    }

    private CompletableFuture<Map<String, UnreadSummary.Unread>>
    setOperatorName(Map<String, UnreadSummary.Unread> msgMap) {
        return execAsync(() -> selProfName.bind()
                .setList("ids", new ArrayList<>(msgMap.keySet()), String.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream().reduce(msgMap,
                                (map, row) -> {
                                    map.get(row.getString("operatorId"))
                                            .setName(row.getString("name"));
                                    return map;
                                },
                                (left, right) -> left)
                        )
                );
    }

    private CompletableFuture<Map<String, UnreadSummary.Unread>>
    setCustomerName(UnreadSummary unreadSummary, Map<String, UnreadSummary.Unread> msgMap) {
        List<String> customerIds = new ArrayList<>(msgMap.keySet());
        return queryCustOrderCnt(unreadSummary, customerIds)
                .thenCompose(counters -> {
                    msgMap.forEach((s, unread) ->
                            unread.setName(String.format(UNREAD_NAME, counters.getOrDefault(s, 0L)))
                    );
                    return CompletableFuture.completedFuture(msgMap);
                });
    }

    private CompletableFuture<Map<String, Long>>
    queryCustOrderCnt(UnreadSummary unreadSummary, List<String> ids) {
        return execAsync(() -> selCustOrdCnt.bind()
                .setString("operatorId", unreadSummary.getSrc().getId())
                .setList("ids", ids, String.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream()
                                .collect(toMap(
                                        r -> r.getString("customerId"),
                                        r -> getLong(r, Open) - getLong(r, Canceled)
                                ))

                ));
    }

    private long getLong(Row row, OrderStatus.Status status) {
        String name = status.name().toLowerCase();
        return row.isNull(name) ? 0 : row.getLong(name);
    }

    private CompletableFuture<ConversationHistory>
    loadConversations(UUID cursor, String meId, String remoteId) {
        return execAsync(() -> selConversationHistory.bind()
                .set("meId", meId, String.class)
                .set("remoteId", remoteId, String.class)
                .set("cursor", cursor, UUID.class))
                .thenCompose(rs -> {
                    ConversationHistory conversation = new ConversationHistory();
                    conversation.setSenderId(remoteId);
                    List<Chat.Message> msgs = rs.all().stream()
                            .map(mapToConversation(meId))
                            .sorted(Comparator.comparingLong(Chat.Message::getTs))
                            .collect(Collectors.toList());
                    conversation.setDialogues(msgs);
                    if (msgs.size() >= LIMIT) {
                        // the message is Id of the dialogue msg, later it will be filled with actual message
                        conversation.setScrollId(msgs.get(0).getText());
                    } else {
                        conversation.setScrollId(null);
                    }
                    return CompletableFuture.completedFuture(conversation);
                });
    }

    private Function<Row, Chat.Message> mapToConversation(String meId) {
        return row -> {
            Chat.Message msg = new Chat.Message();
            UUID msgId = row.getUUID("msgId");
            msg.setTs(UUIDs.unixTimestamp(msgId));
            msg.setMsgId(msgId.toString());
            msg.setText(msgId.toString());
            msg.setPos(row.getBool("self") ? Chat.Position.right : Chat.Position.left);

            return msg;
        };
    }

    // fill actual dialogue message. Currently, the conversation msg is id of the dialogues
    private Function<ConversationHistory, CompletionStage<ConversationHistory>> fillDialogues() {
        return conversation -> {
            List<UUID> ids = conversation.getDialogues().stream()
                    .map(message -> UUID.fromString(message.getText()))
                    .collect(Collectors.toList());
            return loadDialogues(ids)
                    .thenCompose(dialogues -> {
                        List<Chat.Message> msgs = conversation.getDialogues();
                        conversation.setDialogues(msgs.stream()
                                .map(setMessage(dialogues))
                                .collect(Collectors.toList()));
                        return CompletableFuture.completedFuture(conversation);
                    });
        };
    }

    // loading from conversations contains UUID, then, we use uuid as key to load actual msgs from dialogue table
    private Function<Chat.Message, Chat.Message> setMessage(Map<String, String> dialogues) {
        return msg -> {
            msg.setText(dialogues.get(msg.getText()));
            return msg;
        };
    }

    private CompletableFuture<Map<String, String>>
    loadDialogues(List<UUID> ids) {
        return execAsync(() -> selDialogues.bind().setList("ids", ids, UUID.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream().reduce(new HashMap<>(),
                                (map, row) -> {
                                    map.put(row.getUUID("msgId").toString(), row.getString("msg"));
                                    return map;
                                },
                                (left, right) -> left)
                ));
    }
}

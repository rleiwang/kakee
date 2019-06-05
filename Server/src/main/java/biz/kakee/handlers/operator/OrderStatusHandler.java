package biz.kakee.handlers.operator;

import biz.kakee.aeron.EmbeddedAeron;
import biz.kakee.aeron.ipc.AeronIPC;
import biz.kakee.db.CassandraEventHandler;
import biz.kakee.handlers.common.NotificationEventHandler;
import biz.kakee.pvo.events.JournalEvent;
import biz.kakee.pvo.events.request.common.OfflineMessage;
import biz.kakee.pvo.events.request.operator.OrderStatus;
import biz.kakee.pvo.events.response.operator.SafeDeleteEvent;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.BoundStatement;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.SimpleStatement;
import com.datastax.driver.core.querybuilder.QueryBuilder;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableList;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Slf4j
public class OrderStatusHandler extends CassandraEventHandler {
    private final DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMM");
    private final PreparedStatement updOrdStatStmt;
    private final PreparedStatement ordReceivedStmt;
    private final PreparedStatement ordClosedStmt;
    private final PreparedStatement updBillables;

    private final Map<OrderStatus.Status, PreparedStatement> ordCounters = new HashMap<>();

    private final NotificationEventHandler notificationEventHandler;

    public OrderStatusHandler(Session session) {
        super(session);

        SimpleStatement updOrderStatus = new SimpleStatement("UPDATE orders SET status = :status, " +
                "events = events + :event WHERE orderId = :orderId AND customerId = :customerId AND " +
                "operatorId = :operatorId");

        this.ordCounters.put(OrderStatus.Status.Closed,
                session.prepare(createOrderCounterStmt(OrderStatus.Status.Closed)));

        this.ordCounters.put(OrderStatus.Status.Ready,
                session.prepare(createOrderCounterStmt(OrderStatus.Status.Ready)));

        this.ordCounters.put(OrderStatus.Status.Open,
                session.prepare(createOrderCounterStmt(OrderStatus.Status.Open)));

        this.ordCounters.put(OrderStatus.Status.Canceled,
                session.prepare(createOrderCounterStmt(OrderStatus.Status.Canceled)));

        this.updOrdStatStmt = session.prepare(updOrderStatus);

        this.ordClosedStmt = session.prepare(QueryBuilder.batch().add(updOrderStatus)
                .add(new SimpleStatement("DELETE is_open FROM orders WHERE orderId = :orderId AND " +
                        "customerId = :customerId AND operatorId = :operatorId")));

        this.ordReceivedStmt = session.prepare(QueryBuilder.batch()
                .add(new SimpleStatement("UPDATE orders SET status = :status, events = events + :event, " +
                        "orderNum = :orderNum WHERE orderId = :orderId AND customerId = :customerId AND " +
                        "operatorId = :operatorId")));

        this.updBillables = session.prepare("INSERT INTO monthly_billable (monthly, operatorId) VALUES " +
                "(:monthly, :operatorId) IF NOT EXISTS");

        notificationEventHandler = new NotificationEventHandler(session);
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onOrderStatus(final OrderStatus status) {
        updateOrderCounters(status);
        updateOrderStatus(status)
                .thenCombine(searchOnlineMember(status.getDest()), (rs, member) -> member)
                .thenCompose(member -> EmbeddedAeron.sendUniCast(member.getChannel(), member.getStreamId(), status,
                        new AeronIPC.OffLine(OrderStatus.class.getSimpleName(), status.getExpiry()), false))
                .whenComplete((pos, exp) -> {
                    if (exp != null) {
                        log.error("unable publish Aeron messsage", exp);
                        asyncEventBus.post(new OfflineMessage(status.getDest().getId(), OrderStatus.class.getSimpleName(),
                                0, status));
                    } else if (status.getSeqId() > 0) {
                        SafeDeleteEvent safeDeleteEvent = new SafeDeleteEvent(status.getSeqId());
                        Utils.replyObjectMsg(status.getSession(), safeDeleteEvent);
                    }
                    if (status.getStatus() == OrderStatus.Status.Ready) {
                        notificationEventHandler.handleOrderReady(status);
                    }
                });
    }


    private CompletableFuture<ResultSet> updateOrderStatus(OrderStatus status) {
        JournalEvent event = new JournalEvent();
        event.setType(OrderStatus.class.getSimpleName());
        event.setMsg(getValue(status));
        event.setTs(Instant.now());
        return execAsync(() -> prepareBoundStatement(status)
                .set("orderId", UUID.fromString(status.getOrderId()), UUID.class)
                .set("customerId", status.getDest().getId(), String.class)
                .set("operatorId", status.getSrc().getId(), String.class)
                .set("status", status.getStatus().name(), String.class)
                .setList("event", ImmutableList.of(event), JournalEvent.class));
    }

    private void updateOrderCounters(OrderStatus status) {
        PreparedStatement updOrdCounters = ordCounters.get(status.getStatus());
        if (updOrdCounters != null) {
            execAsync(() -> updOrdCounters.bind()
                    .set("operatorId", status.getSrc().getId(), String.class)
                    .set("customerId", status.getDest().getId(), String.class))
                    .whenComplete((rs, exp) -> {
                        if (exp != null) {
                            log.error("unable to update order counters " + status, exp);
                        }
                    });
        }
    }

    private BoundStatement prepareBoundStatement(OrderStatus status) {
        switch (status.getStatus()) {
            case Received:
                updateBillable(status.getSrc().getId());
                return ordReceivedStmt.bind()
                        .set("orderNum", Integer.parseInt(status.getOrderNum()), Integer.class);
            case Closed:
            case Canceled:
                return ordClosedStmt.bind();
        }
        return updOrdStatStmt.bind();
    }

    private String getValue(Object msg) {
        try {
            return new ObjectMapper().writeValueAsString(msg);
        } catch (JsonProcessingException e) {
            return msg.toString();
        }
    }

    private String createOrderCounterStmt(OrderStatus.Status status) {
        String name = status.name().toLowerCase();
        return String.format("UPDATE pair_order_counters SET %s = %s + 1 WHERE customerId = :customerId AND " +
                "operatorId = :operatorId", name, name);
    }

    private void updateBillable(String operatorId) {
        execAsync(() -> updBillables.bind()
                .setString("monthly", dateTimeFormatter.format(Instant.now().atOffset(ZoneOffset.UTC)))
                .setString("operatorId", operatorId))
                .whenComplete((rs, exp) -> {
                    if (exp != null) {
                        log.error("error update monthly billable for " + operatorId, exp);
                    }
                });
    }
}

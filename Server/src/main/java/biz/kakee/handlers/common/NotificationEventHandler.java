package biz.kakee.handlers.common;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.external.gcm.Notifier;
import biz.kakee.pvo.events.request.common.GcmToken;
import biz.kakee.pvo.events.request.operator.OrderStatus;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Row;
import com.datastax.driver.core.Session;
import lombok.extern.slf4j.Slf4j;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.BiFunction;
import java.util.function.Function;

@Slf4j
public class NotificationEventHandler extends CassandraEventHandler {
    private final PreparedStatement selTokenStmt;
    private final PreparedStatement selOrderStmt;
    private final PreparedStatement selProfileStmt;

    public NotificationEventHandler(Session session) {
        super(session);
        this.selTokenStmt = session.prepare("SELECT * FROM gcm_tokens WHERE mid = :mid");
        this.selOrderStmt = session.prepare("SELECT orderNum FROM orders WHERE orderId = :orderId");
        this.selProfileStmt = this.session.prepare("SELECT name FROM profiles WHERE operatorId = :operatorId");
    }

    public void handleOrderReady(OrderStatus status) {
        searchGcmToken(status)
            .thenCombine(searchOrderNum(status), createNotification(status))
            .thenCombine(searchOperatorName(status), setOperatorName())
            .whenComplete((notification, exp) -> {
                if (exp != null) {
                    log.error("unable to send Push Notification to " + status, exp);
                } else {
                    Notifier.notifiy(notification);
                }
            });
    }

    private BiFunction<Notifier.OrderStatusNotification, String, Notifier.OrderStatusNotification>
    setOperatorName() {
        return (notification, name) -> {
            notification.setOperatorName(name);
            return notification;
        };
    }

    private BiFunction<GcmToken, Integer, Notifier.OrderStatusNotification>
    createNotification(OrderStatus status) {
        return (token, ordNum) -> {
            Notifier.OrderStatusNotification notification = new Notifier.OrderStatusNotification();
            notification.setOrderId(status.getOrderId());
            notification.setOperatorId(status.getSrc().getId());
            notification.setGcmToken(token);
            notification.setOrderNum(ordNum);
            return notification;
        };
    }

    private CompletableFuture<GcmToken> searchGcmToken(OrderStatus status) {
        return execAsync(() -> selTokenStmt.bind()
            .setString("mid", status.getDest().getId())
        ).thenCompose(rs -> CompletableFuture.completedFuture(rs.all().stream()
            .findFirst()
            .map(mapToGcmToken())
            .orElseThrow(RuntimeException::new))
        );
    }

    private Function<Row, GcmToken> mapToGcmToken() {
        return row -> {
            GcmToken token = new GcmToken();
            token.setPlatform(row.getString("platform"));
            token.setToken(row.getString("reg_token"));
            return token;
        };
    }

    private CompletableFuture<Integer> searchOrderNum(OrderStatus status) {
        return execAsync(() -> selOrderStmt.bind().setUUID("orderId", UUID.fromString(status.getOrderId())))
            .thenCompose(rs -> CompletableFuture.completedFuture(rs.all().stream()
                .findFirst()
                .map(row -> row.getInt("orderNum"))
                .orElse(0))
            );
    }

    private CompletableFuture<String> searchOperatorName(OrderStatus status) {
        return execAsync(() -> selProfileStmt.bind().setString("operatorId", status.getSrc().getId()))
            .thenCompose(rs -> CompletableFuture.completedFuture(rs.all().stream()
                .findFirst()
                .map(row -> row.getString("name"))
                .orElse("")
            ));
    }
}

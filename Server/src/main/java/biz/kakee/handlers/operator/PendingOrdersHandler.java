package biz.kakee.handlers.operator;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.request.operator.PendingOrders;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Session;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class PendingOrdersHandler extends CassandraEventHandler {
    private final PreparedStatement updatePendingOrders;

    public PendingOrdersHandler(Session session) {
        super(session);

        updatePendingOrders = session.prepare("UPDATE online_members SET pending = :pending WHERE " +
                "mid = :operatorId IF EXISTS");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onPendingOrders(final PendingOrders pendingOrders) {
        execAsync(() -> updatePendingOrders.bind()
                .set("pending", pendingOrders.getPending(), Integer.class)
                .set("operatorId", pendingOrders.getSrc().getId(), String.class))
                .whenComplete((rs, exp) -> {
                    if (exp != null) {
                        log.error("error updating pending order " + pendingOrders, exp);
                    }
                });
    }
}

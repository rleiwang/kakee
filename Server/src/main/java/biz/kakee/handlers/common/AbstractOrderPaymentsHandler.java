package biz.kakee.handlers.common;

import biz.kakee.db.CassandraEventHandler;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Session;

import java.util.UUID;
import java.util.concurrent.CompletionStage;

public abstract class AbstractOrderPaymentsHandler extends CassandraEventHandler {
    private final PreparedStatement updOrdsPay;

    public AbstractOrderPaymentsHandler(Session session) {
        super(session);
        updOrdsPay = session.prepare("UPDATE orders SET payments = :payments WHERE orderId = :orderId AND " +
                "operatorId = :operatorId AND customerId = :customerId IF EXISTS");
    }

    protected CompletionStage<ResultSet>
    updateOrdersPayments(String payments, UUID orderId, String operatorId, String customerId) {
        return execAsync(() -> updOrdsPay.bind()
                .setString("payments", payments)
                .setUUID("orderId", orderId)
                .setString("operatorId", operatorId)
                .setString("customerId", customerId));
    }
}

package biz.kakee.handlers.user;

import biz.kakee.db.CassandraEventHandler;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Session;
import lombok.extern.slf4j.Slf4j;

import java.util.concurrent.CompletableFuture;

@Slf4j
public abstract class UserSearchPreferenceHandler extends CassandraEventHandler {
    private final PreparedStatement custPrefStmt;

    public UserSearchPreferenceHandler(Session session) {
        super(session);

        custPrefStmt = session.prepare("SELECT * FROM customer_preferences WHERE customerId = :customerId");
    }

    public CompletableFuture<ResultSet> searchCustomerPreferences(String customerId) {
        return execAsync(() -> custPrefStmt.bind()
                .set("customerId", customerId, String.class));
    }
}

package biz.kakee.handlers.user;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.request.user.PreferenceAction;
import com.datastax.driver.core.BoundStatement;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Session;
import com.google.common.collect.Sets;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class PreferencesHandler extends CassandraEventHandler {
    private final PreparedStatement updateFavorite;
    private final PreparedStatement deleteFavorite;
    private final PreparedStatement updateTryout;
    private final PreparedStatement deleteTryout;


    public PreferencesHandler(Session session) {
        super(session);
        updateFavorite = session.prepare("UPDATE customer_preferences SET favorites = favorites + :favorite " +
                "WHERE customerId = :customerId");
        deleteFavorite = session.prepare("UPDATE customer_preferences SET favorites = favorites - :favorite " +
                "WHERE customerId = :customerId");
        updateTryout = session.prepare("UPDATE customer_preferences SET tryouts = tryouts + :tryout WHERE " +
                "customerId = :customerId");
        deleteTryout = session.prepare("UPDATE customer_preferences SET tryouts = tryouts - :tryout WHERE " +
                "customerId = :customerId");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onPreferenceAction(final PreferenceAction action) {
        execAsync(() -> getBoundStatment(action))
                .whenComplete((rs, exp) -> {
                    if (exp != null) {
                        log.error("unable to do " + action, exp);
                    }
                });
    }

    private BoundStatement getBoundStatment(PreferenceAction action) {
        PreparedStatement stmt = null;
        String varname = null;
        switch (action.getType()) {
            case FAVORITE:
                stmt = action.isAdd() ? updateFavorite : deleteFavorite;
                varname = "favorite";
                break;
            case TRYOUT:
                stmt = action.isAdd() ? updateTryout : deleteTryout;
                varname = "tryout";
                break;
        }
        return stmt.bind()
                .set("customerId", action.getSrc().getId(), String.class)
                .setSet(varname, Sets.newHashSet(action.getOperatorId()), String.class);
    }
}

package biz.kakee.handlers.user;

import biz.kakee.handlers.HandlerUtils;
import biz.kakee.pvo.events.Order;
import biz.kakee.pvo.events.OrderRecord;
import biz.kakee.pvo.events.request.user.OrderHistory;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Row;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.utils.UUIDs;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
public class OrderHistoryEventHandler extends UserSearchPreferenceHandler {

    @Data
    class HistorySearchResult {
        List<UUID> orders = new ArrayList<>();
        Set<String> operatorIds = new HashSet<>();
    }

    @Data
    class Preference {
        final Set<String> tryouts;
        final Set<String> favorites;
    }

    private final PreparedStatement custOrdStmt;
    private final PreparedStatement ordsStmt;
    private final PreparedStatement profStmt;

    public OrderHistoryEventHandler(Session session) {
        super(session);

        custOrdStmt = session.prepare("SELECT * FROM customer_orders WHERE customerId = :customerId AND " +
                "orderId > :orderId ORDER BY orderId DESC LIMIT 10");

        ordsStmt = session.prepare("SELECT * FROM orders WHERE orderId IN :ids");

        profStmt = session.prepare("SELECT * FROM profiles WHERE operatorId IN :ids");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onOrderHistory(final OrderHistory history) {
        searchCustomerOrders(history)
                .whenComplete((hsr, exp) -> {
                    if (exp != null) {
                        log.error("error searching customer orders " + history, exp);
                    } else {
                        searchHistoryOrders(history, hsr);
                    }
                });
    }

    private void searchHistoryOrders(OrderHistory history, HistorySearchResult hsr) {
        searchProfiles(history.getSrc().getId(), hsr)
                .thenCombine(searchOrders(hsr), combineUserOrderHistory(history, hsr))
                .whenComplete((report, throwable) -> {
                    if (throwable != null) {
                        log.error("error searching history orders " + history, throwable);
                    } else {
                        report.setTopic(OrderHistory.class.getSimpleName());
                        Utils.replyObjectMsg(history.getSession(), report);
                    }
                });
    }

    private BiFunction<Map<String, Map<String, Object>>, Map<String, Order>, OrderHistory>
    combineUserOrderHistory(OrderHistory history, HistorySearchResult hsr) {
        return (profiles, orders) -> {
            history.setOperators(profiles);
            history.setRecords(hsr.getOrders().stream()
                    .map(mapToOrderRecord(orders))
                    .collect(Collectors.toList()));
            return history;
        };
    }

    private Function<UUID, OrderRecord> mapToOrderRecord(Map<String, Order> orders) {
        return uuid -> {
            OrderRecord record = new OrderRecord();
            Order order = orders.get(uuid.toString());
            record.setOrder(order);
            record.setTimestamp(UUIDs.unixTimestamp(uuid));
            return record;
        };
    }

    private CompletableFuture<HistorySearchResult> searchCustomerOrders(OrderHistory history) {
        return execAsync(() -> custOrdStmt.bind()
                .set("customerId", history.getSrc().getId(), String.class)
                .set("orderId", findLowerBound(history.getScrollId()), UUID.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream().reduce(new HistorySearchResult(),
                                (result, row) -> {
                                    result.orders.add(row.getUUID("orderId"));
                                    result.operatorIds.add(row.getString("operatorId"));
                                    return result;
                                },
                                (left, right) -> left)
                        )
                );
    }

    private UUID findLowerBound(String scrollId) {
        if (scrollId == null) {
            return UUIDs.startOf(0);
        }
        return UUID.fromString(scrollId);
    }

    private CompletableFuture<Map<String, Order>> searchOrders(HistorySearchResult hsr) {
        return execAsync(() -> ordsStmt.bind()
                .setList("ids", hsr.getOrders(), UUID.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream()
                                .map(row -> HandlerUtils.toOrder(row))
                                .collect(Collectors.toMap(o -> o.getOrderId(), o -> o)))
                );
    }

    // operatorId -> Profile (key -> value)
    private CompletableFuture<Map<String, Map<String, Object>>> searchProfiles(String mid, HistorySearchResult hsr) {
        return execAsync(() -> profStmt.bind().setList("ids", new ArrayList<>(hsr.getOperatorIds()), String.class))
                .thenCombine(searchCustomerPreferences(mid), mergeUserPreferencesWithProfiles());
    }

    private BiFunction<ResultSet, ResultSet, Map<String, Map<String, Object>>>
    mergeUserPreferencesWithProfiles() {
        return (profiles, preferences) -> {
            Preference prefs = preferences.all().stream().findFirst()
                    .map(row -> new Preference(row.getSet("tryouts", String.class),
                            row.getSet("favorites", String.class)))
                    .orElse(new Preference(Collections.EMPTY_SET, Collections.EMPTY_SET));

            return profiles.all().stream()
                    .map(row -> mapToProfile(prefs, row))
                    .collect(Collectors.toMap(
                            profile -> (String) profile.get("operatorId"),
                            profile -> profile
                    ));
        };
    }

    private Map<String, Object> mapToProfile(Preference prefs, Row row) {
        Map<String, Object> maps = new HashMap<>();
        String operatorId = row.getString("operatorId");
        maps.put("operatorId", operatorId);
        maps.put("name", row.getString("name"));
        maps.put("phone", row.getString("phone"));
        maps.put("tryout", prefs.tryouts.contains(operatorId));
        maps.put("favorite", prefs.favorites.contains(operatorId));
        return maps;
    }
}

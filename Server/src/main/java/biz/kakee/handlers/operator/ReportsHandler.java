package biz.kakee.handlers.operator;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.Menu;
import biz.kakee.pvo.events.Order;
import biz.kakee.pvo.events.request.operator.OrderStatus;
import biz.kakee.pvo.events.request.operator.Report;
import biz.kakee.pvo.events.response.common.HistoryReport;
import biz.kakee.pvo.events.response.common.SalesReport;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.BoundStatement;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Row;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.utils.UUIDs;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@Slf4j
public class ReportsHandler extends CassandraEventHandler {
    private static final String DEFAULT_LIMIT = "10";
    private final PreparedStatement findOrderRange;
    private final PreparedStatement ordRptStmt;
    private final PreparedStatement custOrdStmt;

    public ReportsHandler(Session session) {
        super(session);
        ordRptStmt = session.prepare("SELECT * FROM orders WHERE orderId = :orderId");
        findOrderRange = session.prepare("SELECT orderId, status FROM operator_orders WHERE operatorId = " +
                ":operatorId AND orderId >= :after AND orderId <= :before ORDER BY orderId DESC");
        custOrdStmt = session.prepare("SELECT orderId FROM pair_orders WHERE operatorId = :operatorId AND customerId " +
                "= :customerId ORDER BY orderId DESC LIMIT " + DEFAULT_LIMIT);
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onReport(final Report report) {
        switch (report.getType()) {
            case Sales:
                salesReport(report);
                break;
            case History:
                historyReport(report);
                break;
            case Customer:
                if (report.getCustomerId() != null) {
                    customerReport(report);
                }
                break;
        }
    }

    private void historyReport(final Report report) {
        searchOrderIds(report, findOrderRange, filterAllOrders())
                .thenCompose(generateHistoryReport())
                .whenComplete((historyReport, exp) -> {
                    if (exp != null) {
                        log.error("error to generate report", exp);
                        return;
                    }

                    Collections.sort(historyReport.getHistory(),
                            Comparator.comparingLong(HistoryReport.OrderReport::getTimestamp).reversed());

                    Utils.replyObjectMsg(report.getSession(), historyReport);
                });
    }

    private Function<List<UUID>, CompletionStage<HistoryReport>> generateHistoryReport() {
        return orderIds -> orderIds.stream()
                .map(uuid -> getOrderReportById(uuid))
                .reduce(CompletableFuture.completedFuture(new HistoryReport()),
                        combineHistoryReport(),
                        (left, right) -> left);
    }

    private BiFunction<CompletableFuture<HistoryReport>, CompletableFuture<HistoryReport.OrderReport>,
            CompletableFuture<HistoryReport>> combineHistoryReport() {
        return (ohr, order) ->
                ohr.thenCombine(order, (rpt, ord) -> {
                    rpt.getHistory().add(ord);
                    if (isOrderSold(ord.getStatus(), false)) {
                        HistoryReport.Summary summary = rpt.getSummary();
                        summary.setSubTotal(summary.getSubTotal() + ord.getSubTotal());
                        summary.setTax(summary.getTax() + ord.getTax());
                        summary.setTotal(summary.getTotal() + ord.getTotal());
                        summary.setDiscount(summary.getDiscount() + ord.getDiscount());
                    }
                    return rpt;
                });
    }

    private CompletableFuture<HistoryReport.OrderReport> getOrderReportById(UUID uuid) {
        return execAsync(() -> ordRptStmt.bind().set("orderId", uuid, UUID.class))
                .thenCompose(toOrderReport());
    }

    private Function<ResultSet, CompletionStage<HistoryReport.OrderReport>> toOrderReport() {
        return rs -> CompletableFuture.completedFuture(
                rs.all().stream().findFirst().map(r -> {
                    HistoryReport.OrderReport orderReport = new HistoryReport.OrderReport();
                    UUID orderId = r.getUUID("orderId");
                    orderReport.setOrderId(orderId.toString());
                    orderReport.setOrderNum(r.getInt("orderNum"));
                    orderReport.setType(Order.Type.valueOf(r.getString("type")));
                    orderReport.setSubTotal(r.getFloat("subTotal"));
                    orderReport.setTaxRate(r.getFloat("taxRate"));
                    orderReport.setTax(r.getFloat("tax"));
                    orderReport.setTotal(r.getFloat("total"));
                    orderReport.setDiscount(r.getFloat("discount"));
                    orderReport.setStatus(r.getString("status"));
                    orderReport.setMenuItems(r.getString("menuItems"));
                    orderReport.setTimestamp(UUIDs.unixTimestamp(orderId));
                    return orderReport;
                }).get()
        );
    }

    private void salesReport(final Report report) {
        generateSalesReportItems(report, findOrderRange)
                .whenComplete((items, exp) -> {
                    if (exp != null) {
                        log.error("error to generate report", exp);
                        return;
                    }

                    Utils.replyObjectMsg(report.getSession(), new SalesReport(items));
                });
    }

    private CompletableFuture<Map<String, SalesReport.Item>>
    generateSalesReportItems(Report report, PreparedStatement stmt) {
        return searchOrderIds(report, stmt, filterSoldOrders())
                .thenCompose(generateOrderStatsReport());
    }

    private Function<List<UUID>, CompletionStage<Map<String, SalesReport.Item>>>
    generateOrderStatsReport() {
        return orderIds -> orderIds.stream()
                .map(getMenuFromOrder())
                .reduce(CompletableFuture.completedFuture(new HashMap<>()),
                        scatterSearchOrder(),
                        (left, right) -> left);
    }

    private BiFunction<CompletableFuture<Map<String, SalesReport.Item>>, CompletableFuture<Menu>,
            CompletableFuture<Map<String, SalesReport.Item>>>
    scatterSearchOrder() {
        return (items, menu) -> items.thenCombine(menu, merge());
    }

    private BiFunction<Map<String, SalesReport.Item>, Menu, Map<String, SalesReport.Item>> merge() {
        return (items, menu) -> {
            mergeReport(items, menu.getItems(), Optional.empty());
            return items;
        };
    }

    private Function<UUID, CompletableFuture<Menu>> getMenuFromOrder() {
        return orderId -> execAsync(() -> ordRptStmt.bind().set("orderId", orderId, UUID.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream().map(toMenu()).findFirst().get()
                        )
                );
    }

    private CompletableFuture<List<UUID>> searchOrderIds(final Report report, final PreparedStatement stmt,
                                                         final Predicate<? super Row> filter) {
        return execAsync(() -> createOrderRangeStmt(report, stmt))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream()
                                .filter(filter)
                                .map(r -> r.getUUID("orderId"))
                                .collect(Collectors.toList())
                ));
    }

    private BoundStatement createOrderRangeStmt(final Report report, final PreparedStatement stmt) {
        return stmt.bind()
                .set("after", UUIDs.startOf(report.getAfter()), UUID.class)
                .set("before", UUIDs.endOf(report.getBefore()), UUID.class)
                .set("operatorId", report.getSrc().getId(), String.class);
    }

    private Function<Row, Menu> toMenu() {
        return row -> {
            try {
                return new ObjectMapper().readValue(row.getString("menuItems"), Menu.class);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        };
    }

    private void mergeReport(Map<String, SalesReport.Item> report, List<Menu.Item> items,
                             Optional<Menu.Item> parent) {
        long parentQty = parent.isPresent() ? parseQuantity(parent.get().getQuantity()) : 1L;
        items.stream().forEach(item -> {
            SalesReport.Item rptItem = Optional.ofNullable(report.get(item.getName()))
                    .orElseGet(newReportItem(report, item));

            rptItem.setQuantity(rptItem.getQuantity() + parseQuantity(item.getQuantity()) * parentQty);
            rptItem.setPrice(rptItem.getPrice() + calcSalePrice(item, parentQty));
            mergeReport(rptItem.getSubItems(), item.getSubItems(), Optional.of(item));
        });
    }

    private Supplier<SalesReport.Item> newReportItem(Map<String, SalesReport.Item> report, Menu.Item item) {
        return () -> {
            SalesReport.Item newItem = new SalesReport.Item();
            newItem.setName(item.getName());
            report.put(item.getName(), newItem);
            return newItem;
        };
    }

    private double calcSalePrice(Menu.Item item, long parentQty) {
        return parentQty * parseQuantity(item.getQuantity()) * parsePrice(item.getPrice());
    }

    private int parseQuantity(String val) {
        if (val == null) {
            return 1;
        }
        return Integer.parseInt(val);
    }

    private float parsePrice(String val) {
        if (val == null) {
            return 0;
        }

        return Float.parseFloat(val);
    }

    private Predicate<? super Row> filterAllOrders() {
        return row -> row.isNull("status") ? false : isOrderSold(row.getString("status"), true);
    }

    private Predicate<? super Row> filterSoldOrders() {
        return row -> row.isNull("status") ? false : isOrderSold(row.getString("status"), false);
    }

    private boolean isOrderSold(String status, boolean includeCancel) {
        return status.equals(OrderStatus.Status.Open.name())
                || status.equals(OrderStatus.Status.Ready.name())
                || status.equals(OrderStatus.Status.Closed.name())
                || (includeCancel && status.equals(OrderStatus.Status.Canceled.name()));
    }

    private void customerReport(final Report report) {
        searchCustomerOrderIds(report)
                .thenCompose(generateHistoryReport())
                .whenComplete((historyReport, exp) -> {
                    if (exp != null) {
                        log.error("error to generate report", exp);
                        return;
                    }

                    Utils.replyObjectMsg(report.getSession(), historyReport);
                });
    }


    private CompletableFuture<List<UUID>>
    searchCustomerOrderIds(final Report report) {
        return execAsync(() -> custOrdStmt.bind()
                .setString("operatorId", report.getSrc().getId())
                .setString("customerId", report.getCustomerId())
        ).thenCompose(rs -> CompletableFuture.completedFuture(
                rs.all().stream()
                        .map(r -> r.getUUID("orderId"))
                        .collect(Collectors.toList())
        ));
    }
}
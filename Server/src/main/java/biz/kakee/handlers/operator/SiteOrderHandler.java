package biz.kakee.handlers.operator;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.external.gmail.GmailService;
import biz.kakee.pvo.Menu;
import biz.kakee.pvo.Receipt;
import biz.kakee.pvo.events.JournalEvent;
import biz.kakee.pvo.events.Order;
import biz.kakee.pvo.events.request.operator.OrderStatus;
import biz.kakee.pvo.events.request.operator.PayPalTxInfo;
import biz.kakee.pvo.events.request.operator.SiteOrder;
import biz.kakee.pvo.events.request.operator.SiteOrderStatus;
import biz.kakee.pvo.events.request.operator.payments.CashPayment;
import biz.kakee.pvo.events.request.operator.payments.CreditCardPayment;
import biz.kakee.pvo.events.request.common.paypal.Payment;
import biz.kakee.pvo.events.response.operator.SafeDeleteEvent;
import biz.kakee.utils.DataNotFoundException;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.SimpleStatement;
import com.datastax.driver.core.querybuilder.QueryBuilder;
import com.datastax.driver.core.utils.UUIDs;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableList;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;

@Slf4j
public class SiteOrderHandler extends CassandraEventHandler {
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private final PreparedStatement insertSiteOrder;
    private final PreparedStatement updateOrderStatus;
    private final PreparedStatement customerEmail;
    private final PreparedStatement profile;

    public SiteOrderHandler(Session session) {
        super(session);
        insertSiteOrder = session.prepare(QueryBuilder.batch()
            .add(new SimpleStatement("INSERT INTO orders (orderId, operatorId, customerId, orderNum, status, " +
                "type, city, operatorLatitude, operatorLongitude, subTotal, tax, taxRate, total, " +
                "promoCode, discount, notes, payments, menuVersion, menuItems) VALUES " +
                "(:orderId, :operatorId, :customerId, :orderNum, :status, :type, :city, :operatorLatitude, " +
                ":operatorLongitude, :subTotal, :tax, :taxRate, :total, :promoCode, :discount, :notes, " +
                ":payments, :menuVersion, :menuItems)"))
            .add(new SimpleStatement("INSERT INTO site_orders (operatorId, orderId) VALUES (:operatorId, :orderId)")));

        updateOrderStatus = session.prepare("UPDATE orders SET status = :status, events = events + :event WHERE " +
            "orderId = :orderId AND operatorId = :operatorId AND customerId = :customerId");

        customerEmail = session.prepare("SELECT email FROM paypal_customer_info WHERE operatorId = :operatorId " +
            "AND customerId = :customerId");

        profile = session.prepare("SELECT name,email FROM profiles WHERE operatorId = :operatorId ORDER BY " +
            "version DESC LIMIT 1");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onSiteOrderStatus(final SiteOrderStatus status) {
        JournalEvent event = new JournalEvent();
        event.setType(OrderStatus.class.getSimpleName());
        event.setMsg(getValue(status));
        event.setTs(Instant.now());
        execAsync(() -> updateOrderStatus.bind()
            .set("orderId", UUID.fromString(status.getOrderId()), UUID.class)
            .set("operatorId", status.getSrc().getId(), String.class)
            .set("customerId", Order.Type.OnSite.name(), String.class)
            .set("status", status.getStatus().name(), String.class)
            .setList("event", ImmutableList.of(event), JournalEvent.class))
            .whenComplete((rs, exp) -> {
                if (exp != null) {
                    log.error("unable to to save " + status, exp);
                } else {
                    SafeDeleteEvent safeDeleteEvent = new SafeDeleteEvent(status.getSeqId());
                    Utils.replyObjectMsg(status.getSession(), safeDeleteEvent);
                }
            });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onSiteOrder(final SiteOrder siteOrder) {
        insertSiteOrder(siteOrder)
            .whenComplete((rs, exp) -> {
                if (exp != null) {
                    log.error("unable to insert siteOrder" + siteOrder, exp);
                } else {
                    SafeDeleteEvent safeDelete = new SafeDeleteEvent(siteOrder.getSeqId());
                    Utils.replyObjectMsg(siteOrder.getSession(), safeDelete);
                    emailReceipt(siteOrder);
                }
            });
    }

    private CompletableFuture<ResultSet> insertSiteOrder(SiteOrder order) {
        return execAsync(() -> insertSiteOrder.bind()
            .setUUID("orderId", UUID.fromString(order.getOrderId()))
            .setString("operatorId", order.getSrc().getId())
            .setString("customerId", Order.Type.OnSite.name())
            .setInt("orderNum", order.getOrderNum())
            .setString("type", Order.Type.OnSite.name())
            .setString("status", order.getStatus())
            .setString("city", order.getCity())
            .setString("notes", order.getNotes())
            .setFloat("subTotal", order.getSubTotal())
            .setFloat("taxRate", order.getTaxRate())
            .setFloat("tax", order.getTax())
            .setFloat("total", order.getTotal())
            .setString("promoCode", order.getPromoCode())
            .setFloat("discount", order.getDiscount())
            .setString("payments", order.getPayments())
            .setString("menuVersion", order.getMenuVersion())
            .setString("menuItems", order.getMenuItems())
            .setFloat("operatorLatitude", order.getLatitude())
            .setFloat("operatorLongitude", order.getLongitude()));
    }

    private void emailReceipt(final SiteOrder order) {
        try {
            String payments = order.getPayments();
            if (StringUtils.isNotEmpty(payments)) {
                for (Payment payment : objectMapper.readValue(payments, Payment[].class)) {
                    boolean sent = false;
                    if (payment instanceof CreditCardPayment) {
                        sent = emailReceipt(order, (CreditCardPayment) payment);
                    } else if (payment instanceof CashPayment) {
                        sent = emailReceipt(order, (CashPayment) payment);
                    }

                    if (sent) {
                        break;
                    }
                }
            }
        } catch (Exception e) {
            log.error("error receipt out " + order, e);
        }
    }

    private String getValue(Object msg) {
        try {
            return new ObjectMapper().writeValueAsString(msg);
        } catch (JsonProcessingException e) {
            return msg.toString();
        }
    }

    private boolean emailReceipt(SiteOrder order, CreditCardPayment creditCardPayment) {
        PayPalTxInfo.Contact contact = creditCardPayment.getRptContact();
        if (contact != null) {
            String dest = contact.getDest();
            if (StringUtils.isNotEmpty(dest) && !dest.contains("*") && contact.isEmail()) {
                emailReceipt(order, dest);
                return true;
            }
        }

        PayPalTxInfo.Customer customer = creditCardPayment.getCustomer();
        if (customer != null) {
            execAsync(() -> customerEmail.bind()
                .setString("operatorId", order.getSrc().getId())
                .setString("customerId", customer.getId())
            ).whenComplete((rs, exp) -> {
                if (exp != null) {
                    log.error("error search paypal customer info", exp);
                } else {
                    rs.all().stream()
                        .findFirst()
                        .map(r -> r.getString("email"))
                        .ifPresent(v -> emailReceipt(order, v));
                }
            });

            return true;
        }

        return false;
    }

    private boolean emailReceipt(SiteOrder order, CashPayment cashPayment) {
        String email = cashPayment.getEmail();
        if (StringUtils.isNotEmpty(email)) {
            emailReceipt(order, email);
            return true;
        }
        return false;
    }

    private void emailReceipt(SiteOrder order, String email) {
        execAsync(() -> profile.bind().setString("operatorId", order.getSrc().getId()))
            .thenCompose(mapToReceipt(order))
            .thenCompose(receipt -> GmailService.sendReceipt(email, receipt))
            .whenComplete((msg, exp) -> {
                if (exp != null) {
                    log.error("unable to send out receipt to " + email + ", " + order, exp);
                }
            });
    }

    private Function<ResultSet, CompletionStage<Receipt>> mapToReceipt(SiteOrder order) {
        return rs -> CompletableFuture.completedFuture(rs.all().stream()
            .findFirst()
            .map(row -> {
                try {
                    Menu menu = objectMapper.readValue(order.getMenuItems(), Menu.class);
                    Receipt receipt = new Receipt(menu.getItems());
                    receipt.setInvoice(order.getOrderId());
                    receipt.setName(row.getString("name"));
                    receipt.setTax(order.getTax());
                    receipt.setTaxRate(order.getTaxRate());
                    receipt.setDiscount(order.getDiscount());
                    receipt.setSubTotal(order.getSubTotal());
                    receipt.setTotal(order.getTotal());
                    receipt.setReplyEmail(row.getString("email"));
                    receipt.setTimestamp(UUIDs.unixTimestamp(UUID.fromString(order.getOrderId())));
                    receipt.setLocale(order.getLocale());
                    receipt.setZoneOffset(order.getTzOffset());
                    return receipt;
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }).orElseThrow(DataNotFoundException::new)
        );
    }
}

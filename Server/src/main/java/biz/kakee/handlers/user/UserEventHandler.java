package biz.kakee.handlers.user;

import biz.kakee.aeron.ipc.AeronIPC;
import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.OnlineMember;
import biz.kakee.pvo.events.Order;
import biz.kakee.pvo.events.request.common.OfflineMessage;
import biz.kakee.pvo.events.request.operator.OrderStatus;
import biz.kakee.pvo.events.request.user.*;
import biz.kakee.pvo.geo.GeoLocation;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.*;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import java.util.function.Consumer;

import static biz.kakee.aeron.EmbeddedAeron.sendUniCast;

@Slf4j
public class UserEventHandler extends CassandraEventHandler {
    private final PreparedStatement menuStmt;
    private final PreparedStatement ordStmt;

    public UserEventHandler(Session session) {
        super(session);
        this.menuStmt = this.session
                .prepare(new SimpleStatement("SELECT * FROM menus WHERE operatorId = :operatorId ORDER BY version DESC LIMIT 1"));

        this.ordStmt = this.session.prepare("INSERT INTO orders (orderId, customerId, operatorId, status, type, city," +
                "customerLatitude, customerLongitude, operatorLatitude, operatorLongitude, subTotal, tax," +
                "taxRate, total, promoCode, discount, notes, payments, menuVersion, menuItems, pickupTime, is_open) VALUES" +
                "(:orderId, :customerId, :operatorId, :status, :type, :city, :customerLatitude, " +
                ":customerLongitude, :operatorLatitude, :operatorLongitude, :subTotal, :tax, :taxRate, :total," +
                ":promoCode, :discount, :notes, :payments, :menuVersion, :menuItems, :pickupTime, TRUE)");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onCancelOrder(final CancelOrder cancelOrder) {
        forward(cancelOrder, true);
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onAuthentication(final Authentication authentication) {
        Consumer<Boolean> func = authentication.getOnAuthorize();
        if (func != null) {
            func.accept(true);
        }
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onMobileOrder(final MobileOrder mobileOrder) {
        // find online member and generate uuid
        searchOpenMember(mobileOrder.getDest())
                .thenCombine(getTimeUUID(), inflightMobileOrderCombiner(mobileOrder))
                .whenComplete(handleMobileOrderPlaced(mobileOrder));
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onOrderConfirmation(final OrderConfirmation confirmation) {
        searchOnlineMember(confirmation.getDest())
                .thenCompose(member -> sendUniCast(
                        member.getChannel(), member.getStreamId(), confirmation,
                        new AeronIPC.OffLine(OrderConfirmation.class.getSimpleName(), 0), false))
                .whenComplete((pos, exp) -> {
                    if (exp != null) {
                        log.info("save to offline, due to ", exp);
                        asyncEventBus.post(new OfflineMessage(confirmation.getDest().getId(),
                                OrderConfirmation.class.getSimpleName(), 0, confirmation));
                    }
                });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onOperatorMenu(final OperatorMenu operatorMenu) {
        execAsync(() -> menuStmt.bind()
                .set("operatorId", operatorMenu.getOperatorId(), String.class)
        ).whenComplete((rs, exp) -> {
            operatorMenu.setTopic(OperatorMenu.class.getSimpleName());
            if (exp != null) {
                log.error("unable to get", exp);
            } else {
                Row oneRow = rs.all().get(0);
                operatorMenu.setMenu(oneRow.getString("menu"));
                operatorMenu.setVersion(oneRow.getUUID("version").toString());
            }

            Utils.replyObjectMsg(operatorMenu.getSession(), operatorMenu);
        });
    }

    // Send Aeron message & insert mobile order in parallel
    private BiFunction<OnlineMember, UUID, MobileOrder>
    inflightMobileOrderCombiner(MobileOrder mobileOrder) {
        return (operator, uuid) -> {
            mobileOrder.getOrder().setOrderId(uuid.toString());
            return sendUniCast(operator.getChannel(), operator.getStreamId(), mobileOrder, null, false)
                    .thenCombine(insertMobileOrder(uuid, mobileOrder, operator), (pos, rs) -> mobileOrder)
                    .join();
        };
    }

    private CompletableFuture<ResultSet>
    insertMobileOrder(UUID uuid, MobileOrder mobileOrder, OnlineMember operator) {
        Order order = mobileOrder.getOrder();
        GeoLocation customerLocation = mobileOrder.getGeoLocation();
        return execAsync(() -> ordStmt.bind()
                .setUUID("orderId", uuid)
                .setString("customerId", mobileOrder.getSrc().getId())
                .setString("operatorId", mobileOrder.getDest().getId())
                .setString("type", Order.Type.Mobile.name())
                .setString("status", OrderStatus.Status.Sent.name())
                .setString("city", order.getCity())
                .setString("notes", order.getNotes())
                .setFloat("subTotal", order.getSubTotal())
                .setFloat("taxRate", order.getTaxRate())
                .setFloat("tax", order.getTax())
                .setFloat("total", order.getTotal())
                .setString("promoCode", order.getPromoCode())
                .setFloat("discount", order.getDiscount())
                .setFloat("customerLatitude", customerLocation.getLatitude())
                .setFloat("customerLongitude", customerLocation.getLongitude())
                .setFloat("operatorLatitude", operator.getLatitude())
                .setFloat("operatorLongitude", operator.getLongitude())
                .setString("menuVersion", order.getMenuVersion())
                .setString("menuItems", order.getMenuItems())
                .setLong("pickupTime", order.getPickupTime()));
    }

    private BiConsumer<MobileOrder, Throwable> handleMobileOrderPlaced(MobileOrder input) {
        return (sent, exp) -> {
            OrderStatus status = null;
            if (null != exp) {
                log.error("unable aeron send mobileOrder ", exp);
                status = new OrderStatus(null, null, input.getRefCode(), OrderStatus.Status.OperatorOffline,
                        input.getExpiry(), 0, 0L);
            } else {
                status = new OrderStatus(sent.getOrder().getOrderId(), null, sent.getRefCode(),
                        OrderStatus.Status.Sent, 0, 0, 0L);
            }
            Utils.replyObjectMsg(input.getSession(), status);
        };
    }
}

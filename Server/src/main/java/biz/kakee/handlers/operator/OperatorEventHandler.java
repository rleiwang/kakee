package biz.kakee.handlers.operator;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.WebSocketMessage;
import biz.kakee.pvo.events.request.operator.*;
import biz.kakee.pvo.events.response.operator.Logout;
import biz.kakee.utils.StopExecution;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.BoundStatement;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.SimpleStatement;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;
import java.util.function.Supplier;

@Slf4j
public class OperatorEventHandler extends CassandraEventHandler {
    private final PreparedStatement insertMenu;
    private final PreparedStatement oooMenu;
    private final PreparedStatement openCloseStmt;
    private final PreparedStatement pwdStmt;
    private final PreparedStatement acctStmt;
    private final PreparedStatement loginStmt;

    private final OrderStatusHandler orderStatusHandler;

    public OperatorEventHandler(Session session) {
        super(session);
        insertMenu = session.prepare("INSERT INTO menus (operatorId, version, menu) " +
            "VALUES (:operatorId, :version, :menu)");

        oooMenu = session.prepare("UPDATE menus SET menu = :menu WHERE " +
            "operatorId = :operatorId AND version = :version IF EXISTS");

        openCloseStmt = session.prepare("UPDATE online_members SET isopen = :isopen, pending = :pending, " +
            "latitude = :latitude, longitude = :longitude, taxRate = :taxRate, city = :city, paypal = :paypal, " +
            "square = :square WHERE mid = :mid");

        acctStmt = session.prepare("SELECT iid FROM accounts WHERE operatorId = :operatorId ORDER BY ts DESC LIMIT 1");

        pwdStmt = session.prepare("SELECT password FROM passwords WHERE operatorId = :operatorId");

        loginStmt = session.prepare("INSERT INTO online_members (mid) VALUES (:operatorId) IF NOT EXISTS");

        orderStatusHandler = new OrderStatusHandler(session);
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onCancelOrderError(final CancelOrderError cancelOrderError) {
        forward(cancelOrderError, false);
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onAuthentication(final Authentication authentication) {
        String operatorId = authentication.getOperatorId();
        execAsync(() -> acctStmt.bind().setString("operatorId", operatorId))
            .thenCompose(rs -> {
                long samedevice = rs.all().stream()
                    .filter(r -> r.getString("iid").equals(authentication.getInstallID()))
                    .count();
                if (samedevice == 0) {
                    // not the same device
                    Utils.replyObjectMsg(authentication.getSession(), new Logout());
                    throw new StopExecution();
                }
                return CompletableFuture.completedFuture(rs);
            })
            .thenCompose(rs -> execAsync(() -> loginStmt.bind().setString("operatorId", operatorId)))
            .thenCompose(rs -> {
                if (rs.wasApplied()) {
                    return CompletableFuture.completedFuture(rs);
                }
                // the same operatorId has logged in, reject this one
                Utils.replyObjectMsg(authentication.getSession(), new Logout());
                throw new StopExecution();
            })
            .thenCompose(rs -> execAsync(() -> pwdStmt.bind().setString("operatorId", operatorId)))
            .whenComplete((rs, exp) -> {
                if (exp != null) {
                    if (!(exp.getCause() instanceof StopExecution)) {
                        log.error("error to " + authentication, exp);
                    }
                } else {
                    boolean passwordMatched = rs.all().stream()
                        .findFirst()
                        .map(row -> row.getString("password"))
                        .filter(savedPwd -> StringUtils.isNotEmpty(savedPwd))
                        .map(savedPwd -> savedPwd.equals(authentication.getPassword()))
                        .orElse(Boolean.FALSE);

                    Consumer<Boolean> func = authentication.getOnAuthorize();
                    if (func != null) {
                        func.accept(passwordMatched);
                    }
                }
            });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onReConnected(final ReConnected reConnected) {
        execAsync(() -> loginStmt.bind().setString("operatorId", reConnected.getOperatorId()))
            .whenComplete((rs, exp) -> {
                boolean authed = false;
                if (exp != null) {
                    log.error("error to " + reConnected, exp);
                } else {
                    // the same operatorId has logged in, reject this one
                    authed = rs.wasApplied();
                }
                if (authed) {
                    reConnected.getOnAuthorize().accept(true);
                } else {
                    Utils.replyObjectMsg(reConnected.getAuthorization().getSession(), new Logout());
                }
            });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onMenu(final Menu menu) {
        execAsync(() -> new SimpleStatement("SELECT NOW() FROM system.local")
        ).thenCompose(rs -> {
                UUID uuid = rs.all().get(0).getUUID(0);
                menu.setVersion(uuid.toString());
                return execAsync(() -> insertMenu.bind()
                    .set("operatorId", menu.getSrc().getId(), String.class)
                    .set("version", uuid, UUID.class)
                    .set("menu", menu.getMenu(), String.class))
                    .thenCompose(rows -> CompletableFuture.completedFuture(menu));
            }
        ).whenComplete((savedMenu, exp) -> {
            if (exp != null) {
                log.error("error to save menu", exp);
                return;
            }

            savedMenu.setTopic(Menu.class.getSimpleName());
            Utils.replyObjectMsg(menu.getSession(), savedMenu);
        });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onOutOfOrder(final OutOfOrder outOfOrder) {
        execAsync(() -> oooMenu.bind()
            .set("menu", outOfOrder.getMenu(), String.class)
            .set("operatorId", outOfOrder.getSrc().getId(), String.class)
            .set("version", UUID.fromString(outOfOrder.getVersion()), UUID.class)
        ).whenComplete((rs, exp) -> {
            if (exp != null) {
                log.error("error to save out of menu", exp);
                return;
            }

            outOfOrder.setTopic(OutOfOrder.class.getSimpleName());
            outOfOrder.setUpdated(rs.wasApplied());
            Utils.replyObjectMsg(outOfOrder.getSession(), outOfOrder);
        });
    }


    @Subscribe
    @AllowConcurrentEvents
    public void onOpen(final Open open) {
        updateActivity(open);
        openOrClose(open, () -> createOpenCloseStmt(open, Boolean.TRUE)
            .setString("city", open.getCity())
            .setFloat("taxRate", open.getTaxRate())
            .setString("paypal", open.getPaypal())
            .setString("square", open.getSquare())
            .setInt("pending", open.getPending()));
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onClose(final Close close) {
        openOrClose(close, () -> createOpenCloseStmt(close, Boolean.FALSE));
    }

    private void openOrClose(WebSocketMessage msg, Supplier<BoundStatement> supplier) {
        execAsync(supplier)
            .whenComplete((rs, exp) -> {
                if (exp != null) {
                    log.error("error to open/close " + msg, exp);
                }
            });
    }

    private BoundStatement createOpenCloseStmt(WebSocketMessage msg, boolean isopen) {
        return openCloseStmt.bind()
            .setString("mid", msg.getSrc().getId())
            .setBool("isopen", isopen)
            .setFloat("latitude", msg.getGeoLocation().getLatitude())
            .setFloat("longitude", msg.getGeoLocation().getLongitude());
    }
}

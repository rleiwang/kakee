package biz.kakee.handlers.common;

import biz.kakee.aeron.EmbeddedAeron;
import biz.kakee.db.CassandraEventHandler;
import biz.kakee.handlers.HandlerUtils;
import biz.kakee.pvo.events.Authorized;
import biz.kakee.pvo.events.request.common.MyLocation;
import biz.kakee.pvo.events.request.common.MyLogout;
import biz.kakee.pvo.events.request.common.OfflineMessage;
import biz.kakee.pvo.events.request.operator.CheckInstallation;
import biz.kakee.pvo.events.response.user.OpenOrders;
import biz.kakee.pvo.geo.GeoLocation;
import biz.kakee.utils.OS;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.SimpleStatement;
import com.datastax.driver.core.querybuilder.QueryBuilder;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Slf4j
public class ConnectionHandler extends CassandraEventHandler {
    private final PreparedStatement loginStmt;
    private final PreparedStatement disConnStmt;
    private final PreparedStatement offlineStmt;
    private final PreparedStatement selOffStmt;
    private final PreparedStatement delOffStmt;
    private final PreparedStatement updGeoStmt;
    private final PreparedStatement openOrdersStmt;
    private final PreparedStatement checkSignupStmt;

    public ConnectionHandler(Session session) {
        super(session);
        SimpleStatement connStmt = new SimpleStatement("INSERT INTO sessions " +
                "(mid, tmline, role, activity, latitude, longitude, remote, channel, streamId, socketId, iid) VALUES" +
                "(:mid, now(), :role, :activity, :latitude, :longitude, :remote, :channel, :streamId, :socketId, :iid)");

        this.loginStmt = this.session.prepare(QueryBuilder.batch(connStmt)
                .add(new SimpleStatement("INSERT INTO login_devices (iid, type, mid) VALUES (:iid, 'device', :mid)"))
                .add(new SimpleStatement("INSERT INTO login_devices (iid, type, mid) VALUES (:mid, 'acct', :iid)"))
                .add(new SimpleStatement("INSERT INTO online_members " +
                        "(mid, ts, isopen, role, channel, streamId, latitude, longitude) VALUES " +
                        "(:mid, :ts, false, :role, :channel, :streamId, :latitude, :longitude) ")));

        this.disConnStmt = this.session.prepare(QueryBuilder.batch(connStmt)
                .add(new SimpleStatement("DELETE FROM online_members WHERE mid = :mid")));

        this.offlineStmt = this.session.prepare(
                new SimpleStatement("INSERT INTO offline_messages (mid, msgId, topic, msg, sent, expiry) VALUES " +
                        "(:mid, now(), :topic, :msg, false, :expiry)"));

        this.selOffStmt = this.session.prepare("SELECT * FROM offline_messages WHERE mid = :mid ORDER BY msgId ASC");

        this.delOffStmt = this.session.prepare("DELETE FROM offline_messages WHERE mid = :mid AND msgId = :msgId");

        this.updGeoStmt = this.session.prepare(new SimpleStatement("UPDATE online_members SET " +
                "latitude = :latitude, longitude = :longitude WHERE mid = :mid IF EXISTS"));

        this.openOrdersStmt = this.session.prepare("SELECT * FROM open_orders WHERE customerId = :customerId");

        checkSignupStmt = session.prepare("SELECT operatorId FROM signup_devices WHERE iid = :iid");
    }

    @Data
    private static class CheckInstallationReply {
        private final String topic = CheckInstallation.class.getSimpleName();
        private final boolean showSignUp;
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onCheckInstallation(final CheckInstallation checkInstallation) {
        execAsync(() -> checkSignupStmt.bind().setString("iid", checkInstallation.getInstallID()))
                .whenComplete((rs, exp) -> {
                    if (exp != null) {
                        log.error("unable to check installation " + checkInstallation, exp);
                    } else {
                        Utils.replyObjectMsg(checkInstallation.getSession(),
                                new CheckInstallationReply(rs.all().size() == 0));
                    }
                });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onOfflineMessage(final OfflineMessage msg) {
        execAsync(() -> offlineStmt.bind()
                .set("mid", msg.getUid(), String.class)
                .set("topic", msg.getTopic(), String.class)
                .set("expiry", msg.getExpiry(), Long.class)
                .set("msg", asString(msg.getMessage()), String.class)
        ).exceptionally(e -> {
            log.error("error write offline msg" + msg, e);
            return null;
        });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onLocation(final MyLocation myLocation) {
        execAsync(() -> updGeoStmt.bind()
                .set("mid", myLocation.getSrc().getId(), String.class)
                .set("latitude", myLocation.getGeoLocation().getLatitude(), Float.class)
                .set("longitude", myLocation.getGeoLocation().getLongitude(), Float.class)
        ).whenComplete((rs, exp) -> {
            if (exp != null) {
                log.error("unable to update my location", exp);
            }
        });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onAuthorized(final Authorized authorized) {
        final GeoLocation whereAmI = authorized.getGeoLocation() != null ?
                authorized.getGeoLocation() : new GeoLocation();
        // select orders
        execAsync(() -> openOrdersStmt.bind().set("customerId", authorized.getSrc().getId(), String.class)
        ).thenCompose(rs -> CompletableFuture.completedFuture(
                rs.all().stream().map(HandlerUtils::toOrder).collect(Collectors.toList()))
        ).thenCompose(orders -> {
            // send open orders
            OpenOrders openOrders = new OpenOrders();
            openOrders.getOrders().addAll(orders);
            openOrders.setSession(authorized.getSession());
            openOrders.setSrc(authorized.getSrc());
            asyncEventBus.post(openOrders);
            //return Utils.sendTo(authorized.getSession(), openOrders);
            return CompletableFuture.completedFuture(true);
        }).thenCompose(result -> execAsync(() ->
                // select offline message
                selOffStmt.bind().set("mid", authorized.getSrc().getId(), String.class))
        ).whenComplete((rs, exp) -> rs.all().stream().forEachOrdered(offline ->
                        // send offline message
                        Utils.replyTextMsg(authorized.getSession(), offline.getString("msg"))
                                .whenComplete((ret, err) -> {
                                            if (err != null) {
                                                log.error("ee", err);
                                            }
                                        }
                                        // delete offline messsage
                                ).thenCompose(ret -> execAsync(() -> this.delOffStmt.bind()
                                        .set("mid", offline.getString("mid"), String.class)
                                        .set("msgId", offline.getUUID("msgId"), UUID.class)
                                )
                        )
                // insert into online member
        )).thenCompose(ignored -> execAsync(() -> loginStmt.bind()
                .setString("mid", authorized.getSrc().getId())
                .setString("role", authorized.getSrc().getChannel().name())
                .setFloat("latitude", whereAmI.getLatitude())
                .setFloat("longitude", whereAmI.getLongitude())
                .setString("activity", "login")
                .setString("remote", authorized.getRemote())
                .setString("channel", EmbeddedAeron.UNICAST_CHANNEL())
                .setInt("streamId", OS.PID)
                .setString("socketId", authorized.getSession().getId())
                .setString("iid", authorized.getDeviceId())
                .set("ts", ZonedDateTime.now(ZoneOffset.UTC).toInstant(), Instant.class))
        ).whenComplete((rs, exp) -> {
            if (exp != null) {
                log.error("failed to register login {}, to {}, {}", authorized,
                        EmbeddedAeron.UNICAST_CHANNEL(), OS.PID, exp);
            } else {
                Utils.replyObjectMsg(authorized.getSession(), new biz.kakee.pvo.events.request.common.Authorized());
            }
        });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onMyLogout(final MyLogout myLogout) {
        execAsync(() -> disConnStmt.bind()
                .set("mid", myLogout.getId(), String.class)
                .set("role", myLogout.getChannel().name(), String.class)
                .set("activity", "logout", String.class)
                .set("remote", myLogout.getRemote(), String.class)
                .set("channel", EmbeddedAeron.UNICAST_CHANNEL(), String.class)
                .set("streamId", OS.PID, Integer.class)
                .set("socketId", myLogout.getSession().getId(), String.class)
        ).whenComplete((rs, exp) -> {
            if (exp != null) {
                log.error("failed to unregister mid " + myLogout.getId() + " " +
                        EmbeddedAeron.UNICAST_CHANNEL(), exp);
            }
        });
    }

    private static String asString(Object obj) {
        try {
            return new ObjectMapper().writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return "Error:" + e.getMessage() + ":" + obj.toString();
        }
    }
}

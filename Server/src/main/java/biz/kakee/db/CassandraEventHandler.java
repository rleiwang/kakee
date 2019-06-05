package biz.kakee.db;

import biz.kakee.errors.MemberClose;
import biz.kakee.errors.MemberOffline;
import biz.kakee.pvo.events.Identity;
import biz.kakee.pvo.events.OnlineMember;
import biz.kakee.pvo.events.WebSocketMessage;
import biz.kakee.pvo.geo.GeoLocation;
import biz.kakee.utils.AbstractEventHandler;
import com.datastax.driver.core.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;
import lombok.extern.slf4j.Slf4j;

import javax.annotation.Nullable;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.function.Supplier;

import static biz.kakee.aeron.EmbeddedAeron.sendUniCast;

@Slf4j
public abstract class CassandraEventHandler extends AbstractEventHandler {
    protected final Session session;
    private final ObjectMapper OBJ_MAPPER = new ObjectMapper();
    private final PreparedStatement selOnMemberStmt;
    private final PreparedStatement activityStmt;

    public CassandraEventHandler(Session session) {
        this.session = session;

        this.selOnMemberStmt = this.session.prepare("SELECT * FROM online_members WHERE mid = :mid");

        activityStmt = session.prepare("INSERT INTO sessions (mid, tmline, role, activity, latitude, longitude, body) " +
                "VALUES (:mid, now(), :role, :activity, :latitude, :longitude, :body)");
    }

    protected CompletableFuture<ResultSet> execAsync(Supplier<? extends Statement> supplier) {
        CompletableFuture<ResultSet> future = new CompletableFuture<>();

        CompletableFuture
                .supplyAsync(supplier)
                .exceptionally(exp -> {
                    future.completeExceptionally(exp);
                    return null;
                })
                .thenCompose(stmt -> {
                    if (stmt == null) {
                        future.complete(null);
                    } else {
                        Futures.addCallback(session.executeAsync(stmt), new FutureCallback<ResultSet>() {
                            @Override
                            public void onSuccess(@Nullable ResultSet result) {
                                try {
                                    future.complete(result);
                                } catch (Exception e) {
                                    log.error("on complete exec " + stmt, e);
                                }
                            }

                            @Override
                            public void onFailure(Throwable exp) {
                                try {
                                    future.completeExceptionally(exp);
                                } catch (Exception e) {
                                    log.error("on failure exec " + stmt, e);
                                }
                            }
                        }, es);
                    }
                    return null;
                });
        return future;
    }

    // get channel from online members
    protected CompletableFuture<OnlineMember> searchOnlineMember(Identity dest) {
        return execAsync(() -> selOnMemberStmt.bind().set("mid", dest.getId(), String.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(getOnlineMember(rs)));
    }

   // get channel from online members
    protected CompletableFuture<OnlineMember> searchOpenMember(Identity dest) {
        return execAsync(() -> selOnMemberStmt.bind().set("mid", dest.getId(), String.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(getOpenMember(rs)));
    }

    protected CompletableFuture<UUID> getTimeUUID() {
        return execAsync(() -> new SimpleStatement("SELECT NOW() FROM system.local"))
                .thenCompose(rs -> CompletableFuture.completedFuture(getUUID(rs)));
    }


    /**
     * make it private function to prevent compile error
     * <pre>
     * unreported exception X; must be caught or declared to be thrown
     * .orElseThrow(() -> new RuntimeException()));
     * ^
     * where X,T are type-variables:
     * X extends Throwable declared in method <X>orElseThrow(Supplier<? extends X>)
     * T extends Object declared in class Optional
     *
     * </pre>
     *
     * @param rs
     * @return
     */
    protected OnlineMember getOnlineMember(ResultSet rs) {
        return rs.all().stream().findFirst().map(mapToOnlineMember()).orElseThrow(MemberOffline::new);
    }

    protected OnlineMember getOpenMember(ResultSet rs) {
        return rs.all().stream()
            .filter(r -> !r.isNull("isOpen") && r.getBool("isOpen"))
            .findFirst()
            .map(mapToOnlineMember())
            .orElseThrow(MemberClose::new);
    }

    protected Function<Row, OnlineMember> mapToOnlineMember() {
        return row -> OnlineMember.builder()
                .mid(row.getString("mid"))
                .role(row.getString("role"))
                .latitude(row.getFloat("latitude"))
                .longitude(row.getFloat("longitude"))
                .channel(row.getString("channel"))
                .streamId(row.getInt("streamId"))
                .paypalAccessCode(row.getString("paypal"))
                .squareAppId(row.getString("square"))
                .build();
    }

    private UUID getUUID(ResultSet rs) {
        return rs.all().stream().findFirst().map(row -> row.getUUID(0))
                .orElseThrow(RuntimeException::new);
    }

    protected void forward(final WebSocketMessage msg, final boolean ackOffline) {
        searchOnlineMember(msg.getDest())
            .thenCompose(member -> sendUniCast(member.getChannel(), member.getStreamId(), msg, null, true))
            .whenComplete((pos, exp) -> {
                if (exp != null) {
                    log.error("unable send unit cast " + msg, exp);
                    if (ackOffline) {
                        biz.kakee.websockets.Utils.replyObjectMsg(msg.getSession(),
                            new biz.kakee.pvo.events.response.common.MemberOffline(msg.getDest().getId()));
                    }
                }
            });
    }

    protected void
    updateActivity(WebSocketMessage msg) {
        final Identity src = msg.getSrc();
        final GeoLocation loc = msg.getGeoLocation();
        if (src != null && loc != null) {

            execAsync(() -> activityStmt.bind()
                    .setString("mid", src.getId())
                    .setString("role", src.getChannel().name())
                    .setString("activity", msg.getClass().getSimpleName())
                    .setFloat("latitude", loc.getLatitude())
                    .setFloat("longitude", loc.getLongitude())
                    .setString("body", serialize(msg))
            ).whenComplete((rs, exp) -> {
                if (exp != null) {
                    log.error("failed to update activity " + msg, exp);
                }
            });
        }
    }

    private String serialize(WebSocketMessage msg) {
        try {
            return OBJ_MAPPER.writeValueAsString(msg);
        } catch (JsonProcessingException e) {
            log.error("json error", e);
        }

        return null;
    }
}

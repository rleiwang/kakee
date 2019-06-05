package biz.kakee.handlers.operator;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.request.common.SpecialOffer;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.SimpleStatement;
import com.datastax.driver.core.querybuilder.QueryBuilder;
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
public class SpecialOffersHandler extends CassandraEventHandler {
    private final PreparedStatement insertSpecOfrStmt;
    private final PreparedStatement delSpecOfrStmt;

    public SpecialOffersHandler(Session session) {
        super(session);

        this.insertSpecOfrStmt = session.prepare(QueryBuilder.batch()
            .add(new SimpleStatement("INSERT INTO special_offers (operatorId, version, start_date, end_date, " +
                "discount, promo_code, notes, type) VALUES (:operatorId, :version, :startDate, :endDate, " +
                ":discount, :promoCode, :notes, :type)"))
            .add(new SimpleStatement("INSERT INTO special_offers_history (operatorId, version, start_date, " +
                "end_date, discount, promo_code, notes, type) VALUES (:operatorId, :version, :startDate, " +
                ":endDate, :discount, :promoCode, :notes, :type)")));

        this.delSpecOfrStmt = session.prepare(QueryBuilder.batch()
            .add(new SimpleStatement("UPDATE special_offers_history SET deleted = toTimestamp(now()) WHERE " +
                "operatorId = :operatorId AND version = :version"))
            .add(new SimpleStatement("DELETE FROM special_offers WHERE operatorId = :operatorId AND " +
                "version = :version")));
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onSpecialOffer(final SpecialOffer specialOffer) {
        if (specialOffer.isDeleted()) {
            deleteSpecialOffer(specialOffer)
                .whenComplete((rs, exp) -> {
                    if (exp != null) {
                        log.error("unable to delete special offer " + specialOffer, exp);
                    }
                    specialOffer.setTopic(SpecialOffer.class.getSimpleName());
                    Utils.replyObjectMsg(specialOffer.getSession(), specialOffer);
                });
        } else {
            deleteSpecialOffer(specialOffer)
                .thenCombine(getTimeUUID(), (rs, uuid) -> uuid)
                .thenCompose(insertSpecialOffer(specialOffer))
                .whenComplete((rs, exp) -> {
                    if (exp != null) {
                        log.error("unable to save special offer " + specialOffer, exp);
                    }

                    specialOffer.setTopic(SpecialOffer.class.getSimpleName());
                    Utils.replyObjectMsg(specialOffer.getSession(), specialOffer);
                });
        }
    }

    private Function<UUID, CompletionStage<ResultSet>> insertSpecialOffer(SpecialOffer specialOffer) {
        return uuid -> {
            specialOffer.setVersion(uuid.toString());
            return execAsync(() -> insertSpecOfrStmt.bind()
                .set("operatorId", specialOffer.getSrc().getId(), String.class)
                .set("version", uuid, UUID.class)
                .set("startDate", Instant.ofEpochMilli(specialOffer.getStartDate()), Instant.class)
                .set("endDate", Instant.ofEpochMilli(specialOffer.getEndDate()), Instant.class)
                .set("discount", specialOffer.getDiscount(), Float.class)
                .set("promoCode", specialOffer.getPromoCode(), String.class)
                .set("notes", specialOffer.getNotes(), String.class)
                .set("type", specialOffer.getType().name(), String.class));
        };
    }

    private CompletableFuture<ResultSet> deleteSpecialOffer(SpecialOffer specialOffer) {
        String version = specialOffer.getVersion();
        if (StringUtils.isEmpty(version)) {
            return CompletableFuture.completedFuture(null);
        }
        return execAsync(() -> delSpecOfrStmt.bind()
            .set("operatorId", specialOffer.getSrc().getId(), String.class)
            .set("version", UUID.fromString(specialOffer.getVersion()), UUID.class)
        );
    }
}

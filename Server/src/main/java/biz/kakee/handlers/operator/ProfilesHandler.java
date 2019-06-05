package biz.kakee.handlers.operator;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.request.common.Profile;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.SimpleStatement;
import com.datastax.driver.core.querybuilder.QueryBuilder;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;

@Slf4j
public class ProfilesHandler extends CassandraEventHandler {
    private final PreparedStatement insertProfile;

    public ProfilesHandler(Session session) {
        super(session);

        insertProfile = session.prepare(QueryBuilder.batch()
            .add(new SimpleStatement("DELETE FROM profiles WHERE operatorId = :operatorId AND version < :version"))
            .add(new SimpleStatement("INSERT INTO profiles (operatorId, version, name, phone, email, category, " +
                "priceRange, ccp, description, city, photo, website, twitter, facebook) VALUES (:operatorId, " +
                ":version, :name, :phone, :email, :category, :priceRange, :ccp, :description, :city, :photo, " +
                ":website, :twitter, :facebook)")));
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onProfile(final Profile profile) {
        getTimeUUID()
                .thenCompose(insertNewProfile(profile))
                .whenComplete((uuid, exp) -> {
                    Profile savedProfile = new Profile();
                    savedProfile.setTopic(Profile.class.getSimpleName());
                    if (exp != null) {
                        log.error("error to save profile " + profile, exp);
                    } else {
                        savedProfile.setVersion(uuid.toString());
                    }

                    Utils.replyObjectMsg(profile.getSession(), savedProfile);
                });
    }

    private Function<UUID, CompletionStage<UUID>> insertNewProfile(Profile profile) {
        return uuid -> execAsync(() -> insertProfile.bind()
                .set("operatorId", profile.getSrc().getId(), String.class)
                .set("version", uuid, UUID.class)
                .set("name", profile.getName(), String.class)
                .set("phone", profile.getPhone(), String.class)
                .set("email", profile.getEmail(), String.class)
                .set("category", profile.getCategory(), String.class)
                .set("ccp", profile.getCcp(), String.class)
                .set("priceRange", profile.getPriceRange(), String.class)
                .set("description", profile.getDescr(), String.class)
                .set("city", profile.getPrimaryCity(), String.class)
                .set("photo", profile.getPhoto(), String.class)
                .set("website", profile.getWebsite(), String.class)
                .set("twitter", profile.getTwitter(), String.class)
                .set("facebook", profile.getFacebook(), String.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(uuid));
    }
}

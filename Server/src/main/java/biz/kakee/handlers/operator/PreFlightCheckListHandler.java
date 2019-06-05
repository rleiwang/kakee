package biz.kakee.handlers.operator;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.request.common.Announcement;
import biz.kakee.pvo.events.request.common.Profile;
import biz.kakee.pvo.events.request.common.SpecialOffer;
import biz.kakee.pvo.events.request.operator.Menu;
import biz.kakee.pvo.events.request.operator.PreFlightCheckList;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Row;
import com.datastax.driver.core.Session;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.BiFunction;
import java.util.function.Function;

@Slf4j
public class PreFlightCheckListHandler extends CassandraEventHandler {
    private final PreparedStatement selSpecialOffers;
    private final PreparedStatement selPublishedMenu;
    private final PreparedStatement selAnnouncement;
    private final PreparedStatement selProfile;

    public PreFlightCheckListHandler(Session session) {
        super(session);

        selSpecialOffers = session.prepare("SELECT * FROM special_offers WHERE operatorId = :operatorId " +
                "ORDER BY version DESC LIMIT 1");
        selPublishedMenu = session.prepare("SELECT * FROM menus WHERE operatorId = :operatorId " +
                "ORDER BY version DESC LIMIT 1");
        selAnnouncement = session.prepare("SELECT * FROM announcements WHERE operatorId = :operatorId " +
                "ORDER BY msgId DESC LIMIT 1");
        selProfile = session.prepare("SELECT * FROM profiles WHERE operatorId = :operatorId " +
                "ORDER BY version DESC LIMIT 1");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onPreFlightCheckList(final PreFlightCheckList preFlightCheckList) {
        String operatorId = preFlightCheckList.getSrc().getId();
        CompletableFuture.completedFuture(new PreFlightCheckList())
                .thenCombine(checkSpecialOffer(operatorId), mergeSpecialOffer())
                .thenCombine(checkMenu(operatorId), mergeMenu())
                .thenCombine(checkAnnouncement(operatorId), mergeAnnouncement())
                .thenCombine(checkProfile(operatorId), mergeProfile())
                .whenComplete((checkList, exp) -> {
                    if (exp != null) {
                        log.error("error check pre flight", exp);
                        return;
                    }

                    checkList.setTopic(PreFlightCheckList.class.getSimpleName());
                    Utils.replyObjectMsg(preFlightCheckList.getSession(), checkList);
                });
    }

    private BiFunction<PreFlightCheckList, Optional<SpecialOffer>, PreFlightCheckList> mergeSpecialOffer() {
        return (checkList, specialOffer) -> {
            if (specialOffer.isPresent()) {
                checkList.setSpecialOffer(specialOffer.get());
            }
            return checkList;
        };
    }

    private CompletableFuture<Optional<SpecialOffer>> checkSpecialOffer(String operatorId) {
        return execAsync(() -> selSpecialOffers.bind().set("operatorId", operatorId, String.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream().findFirst().map(toSpecialOffer())
                ));
    }

    private Function<Row, SpecialOffer> toSpecialOffer() {
        return row -> {
            SpecialOffer specialOffer = new SpecialOffer();
            specialOffer.setVersion(row.getUUID("version").toString());
            specialOffer.setStartDate(row.get("start_date", Instant.class).toEpochMilli());
            specialOffer.setEndDate(row.get("end_date", Instant.class).toEpochMilli());
            specialOffer.setDiscount(row.getFloat("discount"));
            specialOffer.setPromoCode(row.getString("promo_code"));
            specialOffer.setNotes(row.getString("notes"));
            specialOffer.setType(SpecialOffer.Type.valueOf(row.getString("type")));
            return specialOffer;
        };
    }

    private BiFunction<PreFlightCheckList, Optional<Menu>, PreFlightCheckList> mergeMenu() {
        return (checkList, menu) -> {
            if (menu.isPresent()) {
                checkList.setPublishedMenu(menu.get());
            }
            return checkList;
        };
    }

    private CompletableFuture<Optional<Menu>> checkMenu(String operatorId) {
        return execAsync(() -> selPublishedMenu.bind().set("operatorId", operatorId, String.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream().findFirst().map(toMenu())
                ));
    }

    private Function<Row, Menu> toMenu() {
        return row -> {
            Menu menu = new Menu();
            menu.setVersion(row.getUUID("version").toString());
            menu.setMenu(row.getString("menu"));
            return menu;
        };
    }

    private BiFunction<PreFlightCheckList, Optional<Announcement>, PreFlightCheckList> mergeAnnouncement() {
        return (checkList, announcement) -> {
            if (announcement.isPresent()) {
                checkList.setAnnouncement(announcement.get());
            }
            return checkList;
        };
    }

    private CompletableFuture<Optional<Announcement>> checkAnnouncement(String operatorId) {
        return execAsync(() -> selAnnouncement.bind().set("operatorId", operatorId, String.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream().findFirst().map(toAnnouncement())
                ));
    }

    private Function<Row, Announcement> toAnnouncement() {
        return row -> {
            Announcement announcement = new Announcement();
            announcement.setId(row.getUUID("msgId").toString());
            announcement.setMsg(row.getString("msg"));
            return announcement;
        };
    }

    private BiFunction<PreFlightCheckList, Optional<Profile>, PreFlightCheckList> mergeProfile() {
        return (checkList, profile) -> {
            if (profile.isPresent()) {
                checkList.setProfile(profile.get());
            }
            return checkList;
        };
    }

    private CompletableFuture<Optional<Profile>> checkProfile(String operatorId) {
        return execAsync(() -> selProfile.bind().set("operatorId", operatorId, String.class))
                .thenCompose(rs -> CompletableFuture.completedFuture(
                        rs.all().stream().findFirst().map(toProfile())
                ));
    }

    private Function<Row, Profile> toProfile() {
        return row -> {
            Profile profile = new Profile();
            profile.setName(row.getString("name"));
            profile.setVersion(row.getUUID("version").toString());
            profile.setEmail(row.getString("email"));
            profile.setCcp(row.getString("ccp"));
            return profile;
        };
    }
}

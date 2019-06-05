package biz.kakee.handlers.operator;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.request.common.Announcement;
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
public class AnnouncementsHandler extends CassandraEventHandler {
    private final PreparedStatement insert;
    private final PreparedStatement delete;
    private final PreparedStatement query;

    public AnnouncementsHandler(Session session) {
        super(session);

        insert = session.prepare(QueryBuilder.batch()
            .add(new SimpleStatement("INSERT INTO announcements (operatorId, msgId, msg) VALUES " +
                "(:operatorId, :msgId, :msg)"))
            .add(new SimpleStatement("INSERT INTO announcements_history (operatorId, msgId, msg) VALUES " +
                "(:operatorId, :msgId, :msg)")));

        delete = session.prepare(QueryBuilder.batch()
            .add(new SimpleStatement("UPDATE announcements_history SET deleted = toTimestamp(now()) WHERE " +
                "operatorId = :operatorId AND msgId = :msgId"))
            .add(new SimpleStatement("DELETE FROM announcements WHERE operatorId = :operatorId AND " +
                "msgId = :msgId")));

        query = session.prepare("SELECT msgId, msg FROM announcements WHERE operatorId = :operatorId");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onAnnoucement(final Announcement announcement) {
        switch (announcement.getStatus()) {
            case NEW:
                insert(announcement);
                break;
            case DELETE:
                delete(announcement);
                break;
            case UPDATE:
                update(announcement);
                break;
            case QUERY:
                query(announcement);
                break;
        }
    }

    private void insert(final Announcement announcement) {
        getTimeUUID()
            .thenCompose(insertAnnouncement(announcement))
            .whenComplete((msg, exp) -> {
                if (exp != null) {
                    log.error("unable to save announcement " + announcement, exp);
                    return;
                }
                announcement.setTopic(Announcement.class.getSimpleName());
                Utils.replyObjectMsg(announcement.getSession(), announcement);
            });
    }

    private Function<UUID, CompletionStage<Announcement>> insertAnnouncement(Announcement announcement) {
        return uuid -> execAsync(() -> insert.bind()
            .set("operatorId", announcement.getSrc().getId(), String.class)
            .set("msgId", uuid, UUID.class)
            .set("msg", announcement.getMsg(), String.class)
        ).thenCompose(rs -> {
            announcement.setId(uuid.toString());
            return CompletableFuture.completedFuture(announcement);
        });
    }

    private void delete(final Announcement announcement) {
        execAsync(() -> delete.bind()
            .set("operatorId", announcement.getSrc().getId(), String.class)
            .set("msgId", UUID.fromString(announcement.getId()), UUID.class)
        ).whenComplete((rs, exp) -> {
            if (exp != null) {
                log.error("unable to delete " + announcement, exp);
                return;
            }
            announcement.setTopic(Announcement.class.getSimpleName());
            Utils.replyObjectMsg(announcement.getSession(), announcement);
        });
    }

    private void update(final Announcement announcement) {
        execAsync(() -> delete.bind()
            .set("operatorId", announcement.getSrc().getId(), String.class)
            .set("msgId", UUID.fromString(announcement.getId()), UUID.class)
        ).whenComplete((rs, exp) -> {
            if (exp != null) {
                log.error("unable to delete announcement " + announcement, exp);
                return;
            }
            insert(announcement);
        });
    }

    private void query(final Announcement announcement) {
        execAsync(() -> query.bind()
            .set("operatorId", announcement.getSrc().getId(), String.class)
        ).whenComplete((rs, exp) -> {
            if (exp != null) {
                log.error("unable to query announcement " + announcement, exp);
                return;
            }

            announcement.setTopic(Announcement.class.getSimpleName());
            rs.all().stream().findFirst().ifPresent(row -> {
                announcement.setId(row.getUUID("msgId").toString());
                announcement.setMsg(row.getString("msg"));
            });
            Utils.replyObjectMsg(announcement.getSession(), announcement);
        });
    }
}

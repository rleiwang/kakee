package biz.kakee.handlers.user;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.external.gmail.GmailService;
import biz.kakee.pvo.events.request.user.Referral;
import biz.kakee.pvo.events.response.user.Invitation;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Row;
import com.datastax.driver.core.Session;
import com.google.api.services.gmail.model.Message;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;

import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.BiConsumer;
import java.util.function.Function;

@Slf4j
public class ReferralEventHandler extends CassandraEventHandler {

    private enum Status {
        SAME_ADDRESS,
        BOUNCED_EMAIL,
        SIGNED_UP
    }

    private static class ReferralValidationException extends RuntimeException {
        @Getter
        private final Status status;

        ReferralValidationException(Status status) {
            super("");
            this.status = status;
        }
    }

    private final PreparedStatement getReferrals;
    private final PreparedStatement insert;
    private final PreparedStatement insertEmail;
    private final PreparedStatement updateEmail;
    private final PreparedStatement checkEmail;
    private final PreparedStatement signedUpEmail;

    public ReferralEventHandler(Session session) {
        super(session);
        getReferrals = session.prepare("SELECT * FROM referrals WHERE userId = :userId");
        insert = session.prepare("INSERT INTO referrals (userId, refId, code, userEmail, operatorEmail) " +
                "VALUES (:userId, :refId, :code, :userEmail, :operatorEmail)");

        insertEmail = session.prepare("INSERT INTO emails (email, refId, userId, threadId) VALUES " +
                "(:email, :refId, :userId, :threadId)");

        updateEmail = session.prepare("UPDATE emails SET bounced = :bounced WHERE email = :email AND refId = :refId " +
                "AND userId = :userId");

        checkEmail = session.prepare("SELECT bounced FROM emails where email in :emails");

        signedUpEmail = session.prepare("SELECT operatorId FROM signup_emails WHERE email = :operatorEmail");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onReferral(final Referral referral) {
        String code = RandomStringUtils.random(7, true, true);

        validateReferrals(referral)
                .thenCompose(validated -> getTimeUUID())
                .thenCompose(processReferral(referral, code))
                .whenComplete((rs, exp) -> {
                    int status = 0;
                    if (exp != null) {
                        if (exp.getCause() instanceof ReferralValidationException) {
                            status = ((ReferralValidationException) exp.getCause()).getStatus().ordinal() + 1;
                        } else {
                            log.error("error process referral " + referral, exp);
                        }
                    }
                    Utils.replyObjectMsg(referral.getSession(), new Invitation(exp == null, status));
                });
    }

    private CompletableFuture<Boolean>
    validateReferrals(Referral referral) {
        CompletableFuture<Boolean> future = new CompletableFuture<>();
        final String operatorEmail = referral.getOperatorEmail();
        try {
            if (operatorEmail.equalsIgnoreCase(referral.getUserEmail())) {
                future.completeExceptionally(new ReferralValidationException(Status.SAME_ADDRESS));
            } else {
                execAsync(() -> getReferrals.bind().setString("userId", referral.getSrc().getId()))
                        .thenCompose(checkSignedUpEmail(referral))
                        .thenCompose(checkBouncedEmail(referral))
                        .whenComplete((rs, exp) -> {
                            if (exp != null) {
                                future.completeExceptionally(exp);
                            } else {
                                future.complete(true);
                            }
                        });
            }
        } catch (Exception e) {
            future.completeExceptionally(e);
        }
        return future;
    }

    private Function<ResultSet, CompletionStage<ResultSet>>
    checkBouncedEmail(Referral referral) {
        return rs -> execAsync(() -> checkEmail.bind()
                .setList("emails", Arrays.asList(referral.getUserEmail(), referral.getOperatorEmail()))
        ).thenCompose(emails -> {
            Optional<Row> bounced = emails.all().stream()
                    .filter(row -> !row.isNull("bounced") && row.getBool("bounced"))
                    .findFirst();

            if (bounced.isPresent()) {
                throw new ReferralValidationException(Status.BOUNCED_EMAIL);
            }

            return CompletableFuture.completedFuture(emails);
        });
    }

    private Function<ResultSet, CompletionStage<ResultSet>>
    checkSignedUpEmail(Referral referral) {
        return rs -> execAsync(() -> signedUpEmail.bind().setString("operatorEmail", referral.getOperatorEmail()))
                .thenCompose(signedup -> {
                    if (signedup.all().size() > 0) {
                        throw new ReferralValidationException(Status.SIGNED_UP);
                    }

                    return CompletableFuture.completedFuture(signedup);
                });
    }

    private Function<UUID, CompletionStage<Message>>
    processReferral(final Referral referral, final String code) {
        return uuid -> insertReferral(referral, code, uuid)
                .thenCombine(sendInvitation(referral, uuid, code), (rrs, invites) -> invites)
                .thenCombine(sendThankyou(referral, uuid, code), (invites, thanks) -> thanks);
    }

    private CompletableFuture<ResultSet>
    insertReferral(Referral referral, String code, UUID refId) {
        return execAsync(() -> insert.bind()
                .setString("userId", referral.getSrc().getId())
                .setUUID("refId", refId)
                .setString("code", code)
                .setString("userEmail", referral.getUserEmail())
                .setString("operatorEmail", referral.getOperatorEmail()))
                .whenComplete(logErrorAtCompletion("insert referral ", referral.toString(), " code ", code));
    }

    private BiConsumer<ResultSet, Throwable> logErrorAtCompletion(String... msg) {
        return (rs, exp) -> {
            if (exp != null) {
                log.error("error to " + msg, exp);
            }
        };
    }

    private CompletableFuture<Message>
    sendInvitation(final Referral referral, final UUID refId, final String code) {
        final String to = referral.getOperatorEmail();
        final String userId = referral.getSrc().getId();
        final Instant sentTime = Instant.now();
        return GmailService.sendInvitation(to, code)
                .thenCompose(insertEmail(userId, refId, to))
                .thenApply(sent -> {
                    GmailService.pollBouncedEmail(sent, sentTime)
                            .thenCompose(updateBouncedEmail(userId, refId, to))
                            .whenComplete((rs, exp) -> {
                                if (exp != null) {
                                    log.error("error polling bounced email ", to, " refId=", refId, exp);
                                }
                            });
                    return sent;
                });
    }

    private CompletableFuture<Message>
    sendThankyou(final Referral referral, final UUID refId, final String code) {
        final String to = referral.getUserEmail();
        final String userId = referral.getSrc().getId();
        final Instant sentTime = Instant.now();
        return GmailService.sendReferral(to, referral.getOperatorEmail(), code)
                .thenCompose(insertEmail(userId, refId, to))
                .thenApply(sent -> {
                    GmailService.pollBouncedEmail(sent, sentTime)
                            .thenCompose(updateBouncedEmail(userId, refId, to))
                            .whenComplete((rs, exp) -> {
                                if (exp != null) {
                                    log.error("error polling bounced email ", to, " refId=", refId, exp);
                                }
                            });
                    return sent;
                });
    }

    private Function<Message, CompletionStage<Message>>
    insertEmail(String userId, UUID refId, String to) {
        return gmail -> execAsync(() -> insertEmail.bind()
                .setString("email", to)
                .setUUID("refId", refId)
                .setString("userId", userId)
                .setString("threadId", gmail.getThreadId()))
                .thenCompose(rs -> CompletableFuture.completedFuture(gmail));
    }

    private Function<GmailService.BouncedMessage, CompletionStage<ResultSet>>
    updateBouncedEmail(String userId, UUID refId, String to) {
        return bounced -> execAsync(() -> updateEmail.bind()
                .setString("email", to)
                .setUUID("refId", refId)
                .setString("userId", userId)
                .setBool("bounced", bounced.isBounced()));
    }
}

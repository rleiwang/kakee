package biz.kakee.handlers.operator;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.external.gmail.GmailService;
import biz.kakee.pvo.StatusCode;
import biz.kakee.pvo.events.request.operator.ResetPasscode;
import biz.kakee.pvo.events.request.operator.SendResetCode;
import biz.kakee.pvo.events.request.operator.SignUpEmail;
import biz.kakee.pvo.events.response.common.VerificationCodeExpiry;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Session;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;

import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Consumer;
import java.util.function.Function;

import static biz.kakee.handlers.HandlerUtils.formatInstant;
import static biz.kakee.pvo.StatusCode.*;

@Slf4j
public class ResetPasscodeHandler extends CassandraEventHandler {
    private final PreparedStatement selAcct;
    private final PreparedStatement insertStmt;
    private final PreparedStatement selectCodeStmt;
    private final PreparedStatement updPwdStmt;

    @Data
    private static class SignUpEmailResponse {
        private final String topic = SignUpEmail.class.getSimpleName();
        private final String email;
    }

    @Data
    private static class ResetPasscodeResponse {
        private final String topic = ResetPasscode.class.getSimpleName();
        private final int status;
    }

    public ResetPasscodeHandler(Session session) {
        super(session);

        selAcct = session.prepare("SELECT * FROM accounts WHERE operatorId = :operatorId ORDER BY ts DESC LIMIT 1");

        insertStmt = session.prepare("INSERT INTO verification (installID, email, expiry, code) VALUES " +
            "(:installID, :email, :expiry, :code)");

        selectCodeStmt = session.prepare("SELECT code FROM verification WHERE installID = :installID AND email = " +
            ":email AND expiry >= :expiry ORDER BY email DESC, expiry DESC LIMIT 1");

        updPwdStmt = session.prepare("UPDATE passwords SET password = :password WHERE operatorId = :operatorId " +
            "IF EXISTS");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onResetPasscode(final ResetPasscode resetPasscode) {
        checkVerificationCode(resetPasscode)
            .thenCompose(updatePassword(resetPasscode))
            .whenComplete((status, exp) -> {
                if (exp != null) {
                    log.error("reset password error " + resetPasscode, exp);
                    status = ERROR;
                } else if (status == SUCCESS) {
                    // authorize access after reset
                    Consumer<Boolean> onAuthorized = resetPasscode.getOnAuthorized();
                    if (onAuthorized != null) {
                        onAuthorized.accept(true);
                    }
                }

                Utils.replyObjectMsg(resetPasscode.getSession(), new ResetPasscodeResponse(status.ordinal()));
            });
    }

    private Function<Boolean, CompletionStage<StatusCode>> updatePassword(ResetPasscode reset) {
        return verified -> {
            if (verified) {
                return execAsync(() -> updPwdStmt.bind()
                    .setString("operatorId", reset.getOperatorId())
                    .setString("password", reset.getPassCode())
                ).thenCompose(rs -> CompletableFuture.completedFuture(rs.wasApplied() ? SUCCESS : NOT_APPLIED));
            }
            return CompletableFuture.completedFuture(NOT_VERFIFIED);
        };
    }

    private CompletableFuture<Boolean> checkVerificationCode(ResetPasscode reset) {
        return execAsync(() -> selectCodeStmt.bind()
            .setString("installID", reset.getOperatorId())
            .setString("email", reset.getOperatorId())
            .set("expiry", ZonedDateTime.now().toInstant(), Instant.class)
        ).thenCompose(rs -> CompletableFuture.completedFuture(
            rs.all().stream()
                .findFirst()
                .filter(row -> row.getString("code").equals(reset.getVerificationCode()))
                .isPresent())
        ).exceptionally(exp -> {
            log.error("error to check verification code " + reset, exp);
            return false;
        });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onSendResetCode(final SendResetCode sendResetCode) {
        queryOperatorEmail(sendResetCode.getOperatorId(), sendResetCode.getInstallID())
            .whenComplete((email, exp) -> {
                if (exp != null) {
                    log.error("error to search for reset" + sendResetCode, exp);
                } else if (email.isPresent()) {
                    forwardResetVerificationCode(email.get(), sendResetCode);
                }
            });
    }

    private void forwardResetVerificationCode(String email, SendResetCode sendResetCode) {
        final String code = RandomStringUtils.randomNumeric(6);
        final Instant expiry = ZonedDateTime.now().plusMinutes(10).toInstant();
        execAsync(() -> insertStmt.bind()
            .setString("installID", sendResetCode.getOperatorId())
            .setString("email", sendResetCode.getOperatorId())
            .set("expiry", expiry, Instant.class)
            .setString("code", code)
        ).whenComplete((rs, exp) -> {
            VerificationCodeExpiry verificationCodeExpiry = new VerificationCodeExpiry();
            if (exp != null) {
                log.error("error save ", exp);
            } else {
                try {
                    GmailService.sendVerificationCode(email, code, formatInstant(sendResetCode, expiry));
                    verificationCodeExpiry.setExpiry(expiry.toEpochMilli());
                } catch (Throwable e) {
                    log.error("error sending email to " + email + " for " + sendResetCode, e);
                }
            }

            Utils.replyObjectMsg(sendResetCode.getSession(), verificationCodeExpiry);
        });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onSignUpEmail(final SignUpEmail signUpEmail) {
        queryOperatorEmail(signUpEmail.getOperatorId(), signUpEmail.getInstallID())
            .whenComplete((email, exp) -> {
                String operatorEmail = email.orElse(null);
                if (exp != null) {
                    log.error("error to search sign up email " + signUpEmail, exp);
                    operatorEmail = null;
                }
                Utils.replyObjectMsg(signUpEmail.getSession(), new SignUpEmailResponse(operatorEmail));
            });
    }

    // filter operator email on the same device
    private CompletableFuture<Optional<String>> queryOperatorEmail(String operatorId, String installationId) {
        return execAsync(() -> selAcct.bind().setString("operatorId", operatorId))
            .thenCompose(rs -> CompletableFuture.completedFuture(
                rs.all().stream()
                    .filter(r -> r.getString("iid").equals(installationId))
                    .findFirst()
                    .map(row -> row.getString("email"))
                )
            );
    }
}

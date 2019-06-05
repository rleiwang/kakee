package biz.kakee.handlers.operator;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.external.gmail.GmailService;
import biz.kakee.pvo.events.request.common.SendVerificationCode;
import biz.kakee.pvo.events.request.common.SignUp;
import biz.kakee.pvo.events.response.common.CodeVerification;
import biz.kakee.pvo.events.response.common.VerificationCodeExpiry;
import biz.kakee.pvo.geo.GeoLocation;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Session;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;

import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.concurrent.CompletableFuture;
import java.util.function.Consumer;

import static biz.kakee.handlers.HandlerUtils.formatInstant;

@Slf4j
public class SignUpHandler extends CassandraEventHandler {
    public static final int FREE_TRIAL_DAYS = 30;
    public static final int BILL_PAY_GRACE_DAYS = 3;

    private final PreparedStatement insertStmt;
    private final PreparedStatement selectCodeStmt;
    private final PreparedStatement insertPasswdStmt;
    private final PreparedStatement insertSignupStmt;
    private final PreparedStatement insertProfileStmt;
    private final PreparedStatement promoCodeStmt;

    public SignUpHandler(Session session) {
        super(session);

        this.insertStmt = session.prepare("INSERT INTO verification (installID, email, expiry, code) VALUES " +
            "(:installID, :email, :expiry, :code)");

        this.selectCodeStmt = session.prepare("SELECT code FROM verification WHERE installID = :installID AND email = " +
            ":email AND expiry >= :expiry ORDER BY email DESC, expiry DESC LIMIT 1");

        this.insertPasswdStmt = this.session.prepare("INSERT INTO passwords (operatorId, name, password) VALUES " +
            "(:operatorId, :name, :password) IF NOT EXISTS");

        this.insertSignupStmt = session.prepare("INSERT INTO accounts (operatorId, ts, email, promotion_code, iid, " +
            "free, grace, tzOffset, latitude, longitude) VALUES (:operatorId, now(), :email, :promoCode, :iid, :free, " +
            ":grace, :tzOffset, :latitude, :longitude)");

        this.insertProfileStmt = this.session.prepare("INSERT INTO profiles (operatorId, version, email) " +
            "VALUES (:operatorId, now(), :email)");

        this.promoCodeStmt = session.prepare("SELECT * FROM invitations WHERE operatorEmail = :email AND " +
            "code = :promoCode");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onSignup(final SignUp signUp) {
        checkVerificationCode(signUp)
            .thenCombine(checkPromotionCode(signUp), (verified, promoted) -> new CodeVerification(verified, promoted))
            .thenCompose(codeVerification -> signup(signUp, codeVerification))
            .whenComplete((codeVerification, exp) -> {
                if (exp != null) {
                    log.error("error to verify " + signUp, exp);
                    codeVerification = new CodeVerification(false, false);
                }
                Utils.replyObjectMsg(signUp.getSession(), codeVerification);
            });
    }

    // return true if promotion code is empty, other wise, check to make sure the code is valid
    private CompletableFuture<Boolean> checkPromotionCode(SignUp signUp) {
        if (StringUtils.isEmpty(signUp.getPromotionCode())) {
            return CompletableFuture.completedFuture(true);
        }
        return execAsync(() -> promoCodeStmt.bind()
            .setString("email", signUp.getEmail())
            .setString("promoCode", signUp.getPromotionCode())
        ).thenCompose(rs -> CompletableFuture.completedFuture(rs.all().stream().findFirst().isPresent()))
            .exceptionally(exp -> {
                log.error("error to check promotion code " + signUp, exp);
                return false;
            });
    }

    private CompletableFuture<Boolean> checkVerificationCode(SignUp signUp) {
        return execAsync(() -> selectCodeStmt.bind()
            .setString("installID", signUp.getInstallID())
            .setString("email", signUp.getEmail())
            .set("expiry", ZonedDateTime.now().toInstant(), Instant.class)
        ).thenCompose(rs -> CompletableFuture.completedFuture(
            rs.all().stream()
                .findFirst()
                .filter(row -> row.getString("code").equals(signUp.getVerificationCode()))
                .isPresent())
        ).exceptionally(exp -> {
            log.error("error to check verification code " + signUp, exp);
            return false;
        });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onSendVerificationCode(final SendVerificationCode sendCode) {
        final String code = RandomStringUtils.randomNumeric(6);
        final Instant expiry = ZonedDateTime.now().plusMinutes(10).toInstant();
        execAsync(() -> insertStmt.bind()
            .setString("installID", sendCode.getInstallID())
            .setString("email", sendCode.getEmail())
            .set("expiry", expiry, Instant.class)
            .setString("code", code)
        ).whenComplete((rs, exp) -> {
            VerificationCodeExpiry verificationCodeExpiry = new VerificationCodeExpiry();
            if (exp != null) {
                log.error("error save ", exp);
            } else {
                try {
                    GmailService.sendVerificationCode(sendCode.getEmail(), code, formatInstant(sendCode, expiry));
                    verificationCodeExpiry.setExpiry(expiry.toEpochMilli());
                } catch (Throwable e) {
                    log.error("error sending email to " + sendCode, e);
                }
            }

            Utils.replyObjectMsg(sendCode.getSession(), verificationCodeExpiry);
        });
    }

    private CompletableFuture<CodeVerification> signup(final SignUp signUp, final CodeVerification codeVerification) {
        if (codeVerification.isPromoted() && codeVerification.isVerified()) {
            // proceed signup only after both are valid
            return execAsync(() -> insertPasswdStmt.bind()
                .setString("operatorId", signUp.getOperatorId())
                .setString("name", signUp.getName())
                .setString("password", signUp.getPassword())
            ).exceptionally(exp -> {
                log.error("exp to save password for SignUp " + signUp, exp);
                return null;
            }).thenCompose(rs -> {
                if (rs != null && rs.wasApplied()) {
                    codeVerification.setTruckIdExists(false);
                    setupBilling(signUp);
                    seedProfile(signUp);
                    GmailService.sendWelcome(signUp.getEmail());

                    // authorize access after signup
                    Consumer<Boolean> onAuthorized = signUp.getOnAuthorized();
                    if (onAuthorized != null) {
                        onAuthorized.accept(true);
                    }
                }
                return CompletableFuture.completedFuture(codeVerification);
            });
        }

        return CompletableFuture.completedFuture(codeVerification);
    }

    private void seedProfile(SignUp signUp) {
        execAsync(() -> insertProfileStmt.bind()
            .setString("operatorId", signUp.getOperatorId())
            .setString("email", signUp.getEmail())
        ).exceptionally(exp -> {
            log.error("error seed profile " + signUp, exp);
            return null;
        });
    }

    private void setupBilling(SignUp signUp) {
        int promotion = StringUtils.isEmpty(signUp.getPromotionCode()) ? 1 : 2;
        GeoLocation location = signUp.getGeoLocation();
        execAsync(() -> insertSignupStmt.bind()
            .setString("operatorId", signUp.getOperatorId())
            .setString("email", signUp.getEmail())
            .setString("promoCode", signUp.getPromotionCode())
            .setString("iid", signUp.getInstallID())
            .setInt("free", FREE_TRIAL_DAYS * promotion)
            .setInt("grace", BILL_PAY_GRACE_DAYS)
            .setInt("tzOffset", signUp.getTzOffset().getTotalSeconds())
            .setFloat("latitude", location != null ? location.getLatitude() : 0F)
            .setFloat("longitude", location != null ? location.getLongitude() : 0F)
        ).exceptionally(exp -> {
            log.error("error setup billings " + signUp, exp);
            return null;
        });
    }
}

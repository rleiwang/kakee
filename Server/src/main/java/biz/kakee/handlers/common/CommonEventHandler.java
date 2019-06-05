package biz.kakee.handlers.common;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.request.common.DeviceInfo;
import biz.kakee.pvo.events.request.common.GcmToken;
import biz.kakee.pvo.events.request.common.MyOrder;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Session;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import com.google.common.hash.Hashing;
import lombok.extern.slf4j.Slf4j;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

@Slf4j
public class CommonEventHandler extends CassandraEventHandler {

    private final PreparedStatement installationStmt;
    private final PreparedStatement insTokenStmt;

    public CommonEventHandler(Session session) {
        super(session);

        this.installationStmt = this.session.prepare("INSERT INTO installations (iid, hash_code, ts, instance_id, " +
            "device_id, manufacturer, model, brand, system_name, system_version, bundle_id, build_number, version, " +
            "readable_version, device_name, user_agent, locale, country) VALUES (:iid, :hash_code, :ts, " +
            ":instance_id, :device_id, :manufacturer, :model, :brand, :system_name, :system_version, :bundle_id, " +
            ":build_number, :version, :readable_version, :device_name, :user_agent, :locale, :country) IF NOT EXISTS");

        this.insTokenStmt = this.session.prepare("INSERT INTO gcm_tokens (mid, platform, reg_token) VALUES " +
            "(:mid, :platform, :reg_token)");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onGcmToken(final GcmToken gcmToken) {
        execAsync(() -> insTokenStmt.bind()
            .setString("mid", gcmToken.getSrc().getId())
            .setString("platform", gcmToken.getPlatform())
            .setString("reg_token", gcmToken.getToken())
        ).whenComplete((rs, exp) -> {
            if (exp != null) {
                log.error("Unable to insert GcmToken " + gcmToken, exp);
            }
        });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onDeviceInfo(final DeviceInfo deviceInfo) {
        execAsync(() -> installationStmt.bind()
            .setString("iid", deviceInfo.getUniqueID())
            .setString("hash_code", sha256(deviceInfo.toString()))
            .set("ts", Instant.now(), Instant.class)
            .setString("instance_id", deviceInfo.getInstanceID())
            .setString("device_id", deviceInfo.getDeviceID())
            .setString("manufacturer", deviceInfo.getManufacturer())
            .setString("model", deviceInfo.getModel())
            .setString("brand", deviceInfo.getBrand())
            .setString("system_name", deviceInfo.getSystemName())
            .setString("system_version", deviceInfo.getSystemVersion())
            .setString("bundle_id", deviceInfo.getBundleID())
            .setString("build_number", deviceInfo.getBuildNumber())
            .setString("version", deviceInfo.getVersion())
            .setString("readable_version", deviceInfo.getReadableVersion())
            .setString("device_name", deviceInfo.getDeviceName())
            .setString("user_agent", deviceInfo.getUserAgent())
            .setString("locale", deviceInfo.getLocale())
            .setString("country", deviceInfo.getCountry())
        ).whenComplete((rs, exp) -> {
            if (exp != null) {
                log.error("error save " + deviceInfo, exp);
            }
        });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onMyOrder(final MyOrder myOrder) {
        myOrder.setTopic(MyOrder.class.getSimpleName());
        forward(myOrder, true);
    }


    private String sha256(String text) {
        return Hashing.sha256().hashBytes(text.toString().getBytes(StandardCharsets.UTF_8)).toString();
    }
}

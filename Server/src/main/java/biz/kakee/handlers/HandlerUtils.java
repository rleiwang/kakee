package biz.kakee.handlers;

import biz.kakee.pvo.dto.Account;
import biz.kakee.pvo.dto.Installation;
import biz.kakee.pvo.dto.SignUpDevice;
import biz.kakee.pvo.events.Order;
import biz.kakee.pvo.events.WebSocketMessage;
import biz.kakee.utils.Crypto;
import com.datastax.driver.core.Row;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Base64;

@Slf4j
public class HandlerUtils {
    public static Order toOrder(Row r) {
        Order order = new Order();
        order.setOrderId(r.getUUID("orderId").toString());
        order.setOperatorId(r.getString("operatorId"));
        order.setOrderNum(r.getInt("orderNum"));
        order.setCity(r.getString("city"));
        order.setStatus(r.getString("status"));
        order.setNotes(r.getString("notes"));
        order.setSubTotal(r.getFloat("subTotal"));
        order.setTaxRate(r.getFloat("taxRate"));
        order.setTax(r.getFloat("tax"));
        order.setTotal(r.getFloat("total"));
        order.setPromoCode(r.getString("promoCode"));
        order.setDiscount(r.getFloat("discount"));
        order.setPayments(r.getString("payments"));
        order.setMenuVersion(r.getString("menuVersion"));
        order.setMenuItems(r.getString("menuItems"));
        order.setPickupTime(r.getLong("pickupTime"));
        return order;
    }

    public static Installation toInstallation(Row r) {
        Installation installation = new Installation();
        installation.setIid(r.getString("iid"));
        installation.setHash_code(r.getString("hash_code"));
        installation.setTs(r.get("ts", Instant.class));
        installation.setInstance_id(r.getString("instance_id"));
        installation.setDevice_id(r.getString("device_id"));
        installation.setManufacturer(r.getString("manufacturer"));
        installation.setModel(r.getString("model"));
        installation.setBrand(r.getString("brand"));
        installation.setSystem_name(r.getString("system_name"));
        installation.setSystem_version(r.getString("system_version"));
        installation.setBundle_id(r.getString("bundle_id"));
        installation.setBuild_number(r.getString("build_number"));
        installation.setVersion(r.getString("version"));
        installation.setReadable_version(r.getString("readable_version"));
        installation.setDevice_name(r.getString("device_name"));
        installation.setUser_agent(r.getString("user_agent"));
        installation.setLocale(r.getString("locale"));
        installation.setCountry(r.getString("country"));
        return installation;
    }

    public static SignUpDevice toSignUpDevice(Row r) {
        SignUpDevice device = new SignUpDevice();
        device.setOperatorId(r.getString("operatorId"));
        device.setTs(r.getUUID("ts"));
        device.setIid(r.getString("iid"));
        return device;
    }

    public static Account toAccount(Row r) {
        Account account = new Account();
        account.setOperatorId(r.getString("operatorId"));
        account.setTs(r.getUUID("ts"));
        account.setEmail(r.getString("email"));
        account.setPromotion_code(r.getString("promotion_code"));
        account.setIid(r.getString("iid"));
        account.setFree(r.getInt("free"));
        account.setGrace(r.getInt("grace"));
        account.setTzOffset(r.getInt("tzOffset"));
        account.setLatitude(r.getFloat("latitude"));
        account.setLongitude(r.getFloat("longitude"));
        return account;
    }

    public static String encrypt(char[] passwd, String plain) {
        try {
            Crypto.Message message = Crypto.encrypt(passwd, plain.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(new ObjectMapper().writeValueAsBytes(message));
        } catch (JsonProcessingException e) {
            log.error("unable encrypt data " + plain, e);
        }

        return "";
    }

    public static String decrypt(char[] passwd, String secret) {
        try {
            Crypto.Message message = new ObjectMapper().readValue(Base64.getDecoder().decode(secret), Crypto.Message.class);
            return new String(Crypto.decrypt(passwd, message), StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("unable encrypt data " + secret, e);
        }

        return "";
    }

    public static String formatInstant(WebSocketMessage msg, Instant instant) {
        // Tue, 3 Jun 2008 11:05:30 GMT
        DateTimeFormatter dtf = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM)
            .withLocale(msg.getLocale())
            .withZone(msg.getTzOffset());

        ZonedDateTime zdt = instant.atZone(msg.getTzOffset());

        return zdt.format(dtf);
    }
}

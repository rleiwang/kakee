package biz.kakee.external.gcm;

import biz.kakee.pvo.events.request.common.GcmToken;
import biz.kakee.pvo.events.request.operator.OrderStatus;
import biz.kakee.utils.Crypto;
import com.google.android.gcm.server.Message;
import com.google.android.gcm.server.Notification;
import com.google.android.gcm.server.Result;
import com.google.android.gcm.server.Sender;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

@Slf4j
public class Notifier {

  @Data
  public static class OrderStatusNotification {
    private GcmToken gcmToken;
    private String orderId;
    private int orderNum;
    private String operatorName;
    private String operatorId;
  }

  private static String KEY;

  public static void start(String encrypted, char[] passwd) {
    KEY = Crypto.decryptWithPasswd(passwd, encrypted);
    if (StringUtils.isEmpty(KEY)) {
      throw new RuntimeException("GCM key is empty");
    }
  }

  public static void notifiy(OrderStatusNotification status) {
    try {
      OrderStatus.Status ready = OrderStatus.Status.Ready;
      Message.Builder msg = new Message.Builder()
          .priority(Message.Priority.HIGH)
          .addData("status", ready.name())
          .addData("orderId", status.getOrderId())
          .addData("operatorId", status.getOperatorId());

      String platform = status.getGcmToken().getPlatform();
      String body = status.getOperatorName() + "'s order #" + status.getOrderNum() + " is " +
          ready.name().toLowerCase();
      if (platform.equals("ios")) {
        Notification.Builder notification = new Notification.Builder("notification").body(body);
        msg.notification(notification.build());
      } else if (platform.equals("android")) {
        msg.addData("title", status.getOperatorName()).addData("body", body);
      }

      Sender sender = new Sender(KEY);
      String token = status.getGcmToken().getToken();
      Result result = sender.send(msg.build(), token, 3);
      if (result.getMessageId() == null) {
        log.error("Error send " + status + " " + result.getErrorCodeName());
      }
    } catch (Exception e) {
      log.error("Error post " + status, e);
    }
  }
}

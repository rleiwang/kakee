package biz.kakee.pvo.events.request.user;

import biz.kakee.pvo.events.Order;
import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

@ToString()
@EqualsAndHashCode(callSuper = true)
@JsonIgnoreProperties(ignoreUnknown = true, allowGetters = true)
public class MobileOrder extends WebSocketMessage {

    @Getter
    private String refCode;

    @Getter
    private long expiry;

    @Getter
    private Order order;
}

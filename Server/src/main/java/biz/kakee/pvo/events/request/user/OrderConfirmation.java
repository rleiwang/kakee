package biz.kakee.pvo.events.request.user;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@JsonIgnoreProperties(ignoreUnknown = true, allowGetters = true)
public class OrderConfirmation extends WebSocketMessage {

    private final String orderId;
}

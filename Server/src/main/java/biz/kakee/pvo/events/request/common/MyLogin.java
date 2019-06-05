package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.ToString;

@ToString(callSuper = true)
@JsonIgnoreProperties(ignoreUnknown = true)
public class MyLogin extends WebSocketMessage {
    @Getter
    private String token;

    @Getter
    private DeviceInfo deviceInfo;
}

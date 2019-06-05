package biz.kakee.pvo.events.response.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class PaypalToken extends WebSocketMessage {
    @JsonProperty("access_token")
    private String accessToken;

    @JsonProperty("refresh_url")
    private String refreshURL;

    @JsonProperty("expires_in")
    private long expires;

    {
        setTopic(PaypalToken.class.getSimpleName());
    }
}

package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PayPalTxInfo extends WebSocketMessage {

    @Data
    public static class Contact {
        @JsonProperty("isEmail")
        private boolean isEmail;
        private String dest;
    }

    @Data
    public static class Customer {
        private String id;
        private String name;
        private String email;
        private String phone;
        private String token;
    }

    private String orderId;
    private String uid;
    private String authId;
    private String authCode;
    private Customer customer;
    private Contact rptContact;
    private String rptToken;
    private String txHandle;
    private String status;
    private String txId;
    private String invId;
    private String crlId;
}

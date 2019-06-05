package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SquareTxInfo extends WebSocketMessage {
    private String uid;
    private String txId;
    private String clientTxId;
    private String orderId;
    private float paid;
}

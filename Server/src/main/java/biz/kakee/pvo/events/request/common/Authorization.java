package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

/**
 * Operator/User app sends Authorization to request reconnection
 * After initial auth, Operator/User app contains a PKI encrypted
 * token.
 */
@Data
public class Authorization extends WebSocketMessage {
    private String token;
}

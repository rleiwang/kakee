package biz.kakee.pvo.paypal;

import lombok.Data;

/**
 * <pre>
 * {
 *   "clientId" : "clientId",
 *   "secret" : "secret"
 * }
 * </pre>
 */
@Data
public class ApiKey {
    private final String clientId;
    private final String secret;
}

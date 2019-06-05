package biz.kakee.pvo.paypal;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * https://github.com/PayPal-Mobile/ios-here-sdk-dist/blob/release-1.6/docs/SupportingTokenRefresh.md
 * <p>
 * The properties are returned to Mobile Client
 * <p>
 * <p>
 * <pre>
 * {
 *   "access_token": "",
 *   "refresh_url": "",
 *   "expires_in": 28801
 * }
 *  </pre>
 */
@Data
public class AccessToken {
    @JsonProperty("access_token")
    private String accessToken;

    @JsonProperty("refresh_url")
    private String refreshURL;

    @JsonProperty("expires_in")
    private long expires;
}

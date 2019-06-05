package biz.kakee.pvo.paypal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * This is the response from PayPal Oauth login
 * <p>
 * The followings should store on Server with TTL
 * <p>
 * <pre>
 * {
 *  "token_type":"Bearer",
 *  "expires_in":"28800",
 *  "refresh_token":"",
 *  "id_token":"",
 *  "access_token":"A015-QkLfqNFt5qkFHXRVNFF5A8XpxEWSzRNnHoYxJtTRIM"
 * }
 * </pre>
 */
@Data
@EqualsAndHashCode(callSuper = true)
@JsonIgnoreProperties(ignoreUnknown = true)
public class OAuthToken extends AccessToken {
    @JsonProperty("token_type")
    private String tokenType;

    @JsonProperty("refresh_token")
    private String refreshToken;
}


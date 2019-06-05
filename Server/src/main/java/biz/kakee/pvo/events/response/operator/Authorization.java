package biz.kakee.pvo.events.response.operator;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Server issues this Authorization after successful password challenge
 */
@Data
public class Authorization {
    private final String topic = Authorization.class.getSimpleName();

    @JsonProperty("isProd")
    private final boolean isProd;
    private final String token;
}

package biz.kakee.pvo.events.request.user;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.HashSet;
import java.util.Set;

@Data
@EqualsAndHashCode(callSuper = true)
@JsonIgnoreProperties(ignoreUnknown = true)
public final class SearchingFoodTrucks extends WebSocketMessage {

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Filter {
        private String name;
        private boolean favorite;
        private boolean tryout;
        private boolean hasSpecialOffer;
        private Set<String> categories = new HashSet<>();
    }

    private final float latitude;
    private final float longitude;
    private final float latDelta;
    private final float longDelta;
    private final Filter filter;
    private final String scrollId;
}

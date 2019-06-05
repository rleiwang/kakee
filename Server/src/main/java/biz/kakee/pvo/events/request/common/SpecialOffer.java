package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SpecialOffer extends WebSocketMessage {
    public enum Type {P, S, B}

    private String version;
    private long startDate;
    private long endDate;
    private float discount;
    private String promoCode;
    private String notes;
    private Type type;
    private boolean deleted;
}

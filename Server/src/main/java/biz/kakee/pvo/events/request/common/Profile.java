package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@JsonIgnoreProperties(ignoreUnknown = true)
public class Profile extends WebSocketMessage {
    private String operatorId;
    private String version;
    private String name;
    private String phone;
    private String email;
    private String category;
    private String ccp;
    private String priceRange;
    private String descr;
    private String photo;
    private String primaryCity;
    private String website;
    private String twitter;
    private String facebook;
}

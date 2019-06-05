package biz.kakee.pvo.events.request.user;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@ToString
@EqualsAndHashCode(callSuper = true)
@JsonIgnoreProperties(ignoreUnknown = true, allowGetters = true)
public class OperatorMenu extends WebSocketMessage {

    @Getter
    private String operatorId;

    @Getter
    @Setter
    private String version;

    @Getter
    @Setter
    private String menu;
}

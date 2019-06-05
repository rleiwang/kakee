package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import biz.kakee.pvo.events.request.common.Announcement;
import biz.kakee.pvo.events.request.common.Profile;
import biz.kakee.pvo.events.request.common.SpecialOffer;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class PreFlightCheckList extends WebSocketMessage {
    private SpecialOffer specialOffer;
    private Menu publishedMenu;
    private Announcement announcement;
    private Profile profile;
}

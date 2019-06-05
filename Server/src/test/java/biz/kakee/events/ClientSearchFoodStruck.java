package biz.kakee.events;

import biz.kakee.pvo.events.request.user.SearchingFoodTrucks;
import lombok.Data;

@Data
public class ClientSearchFoodStruck extends ClientMessage {
    private final String topic = SearchingFoodTrucks.class.getSimpleName();
}

package biz.kakee.pvo.events.response.user;

import biz.kakee.pvo.events.Order;
import biz.kakee.pvo.events.WebSocketMessage;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class OpenOrders extends WebSocketMessage {
    private final List<Order> orders = new ArrayList<>();
    private final List<FoundFoodTrucks.FoodTruck> trucks = new ArrayList<>();

    {
        super.setTopic(OpenOrders.class.getSimpleName());
    }
}

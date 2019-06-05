package biz.kakee.pvo.events.response.user;

import biz.kakee.pvo.geo.GeoLocation;
import lombok.Data;

import java.util.List;

@Data
public class FoundFoodTrucks {
    @Data
    public static class SpecialOffer {
        private long startDate;
        private long endDate;
        private float discount;
    }

    @Data
    public static class FoodTruck {
        private String operatorId;
        private GeoLocation location;
        private String name;
        private String category;
        private String phone;
        private String priceRange;
        private String photo;
        private String city;
        private float taxRate;
        private int pending;
        private SpecialOffer specialOffer;
        private String announcement;
        private boolean favorite;
        private boolean tryout;
        private boolean isOnline = true;
    }

    private final String topic = FoundFoodTrucks.class.getSimpleName();
    private final String scrollId;
    private final List<FoodTruck> foodTrucks;
}

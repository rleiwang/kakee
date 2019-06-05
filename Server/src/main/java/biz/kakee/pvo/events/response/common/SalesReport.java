package biz.kakee.pvo.events.response.common;

import lombok.Data;

import java.util.HashMap;
import java.util.Map;

@Data
public class SalesReport {

    private final String topic = SalesReport.class.getSimpleName();

    @Data
    public static class Item {
        private String name;
        private long quantity;
        private double price;
        private Map<String, Item> subItems = new HashMap<>();
    }

    private final Map<String, Item> orders;
}

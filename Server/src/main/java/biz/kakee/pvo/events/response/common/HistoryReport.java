package biz.kakee.pvo.events.response.common;

import biz.kakee.pvo.events.Order;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class HistoryReport {
    private final String topic = HistoryReport.class.getSimpleName();

    @Data
    public static class OrderReport {
        private String orderId;
        private int orderNum;
        private Order.Type type;
        private float subTotal;
        private float taxRate;
        private float tax;
        private float total;
        private float discount;
        private String status;
        private long timestamp;
        private String menuItems;
    }

    @Data
    public static class Summary {
        private float subTotal;
        private float tax;
        private float total;
        private float discount;
    }

    private final Summary summary = new Summary();
    private final List<OrderReport> history = new ArrayList<>();
}

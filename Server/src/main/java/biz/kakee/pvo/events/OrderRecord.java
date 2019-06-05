package biz.kakee.pvo.events;

import lombok.Data;

@Data
public class OrderRecord {
    private long timestamp;
    private Order order;
}

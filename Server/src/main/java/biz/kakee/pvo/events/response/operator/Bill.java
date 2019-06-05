package biz.kakee.pvo.events.response.operator;

import lombok.Data;

@Data
public class Bill {
    private String id;
    private long month;
    private String invoice;
    private double sales;
    private double commission;
    private double ads;
    private final double rate;
}

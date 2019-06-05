package biz.kakee.pvo;

import lombok.Data;

import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

@Data
public class Receipt {
    private final List<Menu.Item> items;
    private float tax;
    private float taxRate;
    private float discount;
    private float subTotal;
    private float total;
    private String invoice;
    private String name;
    private String replyEmail;
    private long timestamp;
    private Locale locale;
    private ZoneOffset zoneOffset;
}

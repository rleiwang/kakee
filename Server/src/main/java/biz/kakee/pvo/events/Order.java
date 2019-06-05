package biz.kakee.pvo.events;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Order {
    public enum Type {
        Mobile,
        OnSite
    }

    private String orderId;
    private String operatorId;
    private int orderNum;
    private Type type;
    private String city;
    private String status;
    private String notes;
    private String promoCode;
    private float subTotal;
    private float taxRate;
    private float tax;
    private float total;
    private float discount;
    private String payments;
    private String menuVersion;
    private String menuItems;
    private long pickupTime;
}

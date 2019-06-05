package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.WebSocketMessage;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@JsonIgnoreProperties(ignoreUnknown = true)
public class SiteOrder extends WebSocketMessage {
    private String orderId;
    private int orderNum;
    private String city;
    private String status;
    private String notes;
    private String promoCode;
    private float latitude;
    private float longitude;
    private float subTotal;
    private float taxRate;
    private float tax;
    private float total;
    private float discount;
    private String payments;
    private String menuVersion;
    private String menuItems;
    private long seqId;
}

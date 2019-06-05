package biz.kakee.pvo.events.request.operator.payments;

import biz.kakee.pvo.events.request.common.paypal.Payment;
import biz.kakee.pvo.events.request.operator.PayPalTxInfo;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

import java.util.Map;

@Data
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class CreditCardPayment extends Payment {
    @Data
    public static class Details {
        private float subTotal;
        private float fees;
        private float gratuityTotal;
        private float taxTotal;
        private Map taxDetails;
        private float total;
        private float refundTotal;
    }

    private String authId;
    private String authCode;
    private PayPalTxInfo.Contact rptContact;
    private PayPalTxInfo.Customer customer;
    private String rptToken;
    private Details details;
    private String txHandle;
    private long txDate;
    private String txId;
    private String orderId;
    private String crlId;
    private String invId;
    private String status;

    @JsonProperty("paypal")
    private boolean isPaypal;
}

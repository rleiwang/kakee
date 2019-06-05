package biz.kakee.pvo.events.request.user.payments;

import biz.kakee.pvo.events.request.common.paypal.BraintreePayment;
import biz.kakee.pvo.events.request.common.paypal.Payment;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class PaypalPayment extends Payment {
    @JsonCreator
    public PaypalPayment(@JsonProperty("details") BraintreePayment details) {
        this.details = details;

        setTimestamp(details.getPaid());
        setPaid((float) details.getAmount());
    }

    private final BraintreePayment details;
}

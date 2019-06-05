package biz.kakee.pvo.events.request.common.paypal;

import biz.kakee.pvo.events.request.operator.payments.CashPayment;
import biz.kakee.pvo.events.request.operator.payments.CreditCardPayment;
import biz.kakee.pvo.events.request.operator.payments.SquarePayment;
import biz.kakee.pvo.events.request.user.payments.PaypalPayment;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.Data;

@Data
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "method")
@JsonSubTypes({@JsonSubTypes.Type(name = "CS", value = CashPayment.class),
    @JsonSubTypes.Type(name = "CC", value = CreditCardPayment.class),
    @JsonSubTypes.Type(name = "PP", value = PaypalPayment.class),
    @JsonSubTypes.Type(name = "SQ", value = SquarePayment.class)})
public abstract class Payment {
    public enum Type {CS, CC, PP, SQ}

    // don't need to provide method, it will be generated
    private float paid;
    private long timestamp;
}

package biz.kakee.pvo.events.request.operator.payments;

import biz.kakee.pvo.events.request.common.paypal.Payment;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class CashPayment extends Payment {
    private String email;
}

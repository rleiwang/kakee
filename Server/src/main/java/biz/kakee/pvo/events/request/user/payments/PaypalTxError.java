package biz.kakee.pvo.events.request.user.payments;

import lombok.Data;

@Data
public class PaypalTxError {
    private final String topic = PaypalTxError.class.getSimpleName();
    private final String orderId;
}

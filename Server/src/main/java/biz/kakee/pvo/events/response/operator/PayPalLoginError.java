package biz.kakee.pvo.events.response.operator;

import lombok.Data;

@Data
public class PayPalLoginError {
    private final String topic = PayPalLoginError.class.getSimpleName();
}

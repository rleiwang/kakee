package biz.kakee.pvo.events.request.common.paypal;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonPOJOBuilder;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
@JsonDeserialize(builder = BraintreePayment.BraintreePaymentBuilder.class)
public class BraintreePayment {
    private final String instrumentType;
    private final String nonce;
    private final String btTxId;
    private final String invoiceId;
    private final double amount;
    private final long paid;
    private final String payerEmail;
    private final String payerId;
    private final String payerFirstName;
    private final String payerLastName;
    private final String paymentId;
    private final String authId;

    @JsonPOJOBuilder(withPrefix = "")
    public static final class BraintreePaymentBuilder {
    }
}

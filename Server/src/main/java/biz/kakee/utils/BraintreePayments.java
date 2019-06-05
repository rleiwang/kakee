package biz.kakee.utils;

import biz.kakee.pvo.events.request.common.paypal.BraintreePayment;
import com.braintreegateway.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.util.concurrent.CompletableFuture;

@Slf4j
public class BraintreePayments {

    public static class TxException extends java.lang.Exception {
        public TxException(ValidationErrors errors, String message) {
            super(String.format("%s: %s", message, printString(errors)));
        }

        private static String printString(ValidationErrors errors) {
            try {
                return new ObjectMapper().writeValueAsString(errors);
            } catch (JsonProcessingException e) {
                return "[error parse " + errors + "]";
            }
        }
    }

    @Data
    @Builder
    public static class Request {
        private final String seller;
        private final String buyer;
        private final String accessToken;
        private final String nonce;
        private final String amount;
        private final String invoiceId;
        private final String reference;
        private final String description;
        private final String name;
    }

    public static CompletableFuture<BraintreePayment> sale(Request request) {
        CompletableFuture<BraintreePayment> future = new CompletableFuture<>();
        try {
            // https://developers.braintreepayments.com/reference/request/transaction/sale/java
            TransactionRequest txReq = new TransactionRequest()
                    .orderId(request.getInvoiceId())
                    .amount(new BigDecimal(request.getAmount()))
                    .paymentMethodNonce(request.getNonce());

            //tdr.name("tristonetech*kakee")
            txReq.descriptor()
                    .name(request.getName())
                    .done();

            txReq.options()
                    .paypal()
                    .description(request.getDescription())
                    .done()

                    .submitForSettlement(true)
                    .storeInVaultOnSuccess(true)
                    .done();

            Result<Transaction> result = new BraintreeGateway(request.getAccessToken().trim())
                    .transaction()
                    .sale(txReq);

            if (result.isSuccess()) {
                Transaction tx = result.getTarget();
                // save to disk txId
                log.info("success buyer: {}, seller: {}, invoice: {}, tx: {}", request.getBuyer(), request.getSeller(),
                        request.getInvoiceId(), tx.getId());

                BraintreePayment.BraintreePaymentBuilder paymentBuilder = BraintreePayment.builder()
                        .nonce(request.getNonce())
                        .instrumentType(tx.getPaymentInstrumentType())
                        .btTxId(tx.getId())
                        .invoiceId(tx.getOrderId())
                        .amount(tx.getAmount().doubleValue())
                        .paid(tx.getCreatedAt().getTimeInMillis());

                PayPalDetails paypal = tx.getPayPalDetails();

                if (paypal != null) {
                    paymentBuilder.payerEmail(paypal.getPayerEmail())
                            .payerId(paypal.getPayerId())
                            .payerFirstName(paypal.getPayerFirstName())
                            .payerLastName(paypal.getPayerLastName())
                            .paymentId(paypal.getPaymentId())
                            .authId(paypal.getAuthorizationId());
                }

                future.complete(paymentBuilder.build());
            } else {
                future.completeExceptionally(new TxException(result.getErrors(), result.getMessage()));
            }
        } catch (Exception e) {
            future.completeExceptionally(e);
        }

        return future;
    }

    public static String fetchClientToken(String accessToken) {
        BraintreeGateway gateway = new BraintreeGateway(accessToken.trim());
        return gateway.clientToken().generate();
    }
}

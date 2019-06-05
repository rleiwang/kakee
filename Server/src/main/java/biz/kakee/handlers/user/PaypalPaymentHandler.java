package biz.kakee.handlers.user;

import biz.kakee.aeron.EmbeddedAeron;
import biz.kakee.aeron.ipc.AeronIPC;
import biz.kakee.errors.MemberOffline;
import biz.kakee.handlers.HandlerUtils;
import biz.kakee.handlers.common.AbstractOrderPaymentsHandler;
import biz.kakee.pvo.events.Channel;
import biz.kakee.pvo.events.Identity;
import biz.kakee.pvo.events.OnlineMember;
import biz.kakee.pvo.events.request.common.OfflineMessage;
import biz.kakee.pvo.events.request.common.SquareTxError;
import biz.kakee.pvo.events.request.common.paypal.BraintreePayment;
import biz.kakee.pvo.events.request.common.paypal.Payment;
import biz.kakee.pvo.events.request.user.payments.*;
import biz.kakee.utils.BraintreePayments;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Session;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.BiFunction;
import java.util.function.Function;

@Slf4j
public class PaypalPaymentHandler extends AbstractOrderPaymentsHandler {
    private final PreparedStatement profile;
    private final char[] passwd;

    public PaypalPaymentHandler(Session session, char[] passwd) {
        super(session);
        this.passwd = passwd;
        profile = session.prepare("SELECT name FROM profiles WHERE operatorId = :operatorId");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onSquareTxErr(final SquareTxError error) {
        error.setTopic(SquareTxError.class.getSimpleName());
        forward(error, false);
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onSquareCheckout(final SquareCheckout checkout) {
        searchOnlineMember(checkout.getDest())
            .thenCompose(operator -> EmbeddedAeron.sendUniCast(operator.getChannel(), operator.getStreamId(), checkout,
                new AeronIPC.OffLine(SquareCheckout.class.getSimpleName(), 0L), true))
            .whenComplete((pos, exp) -> {
                if (exp != null) {
                    log.error("save offline, unable publish aeron " + checkout, exp);
                    asyncEventBus.post(new OfflineMessage(checkout.getDest().getId(),
                        SquareCheckout.class.getSimpleName(), 0, checkout));
                    Utils.replyObjectMsg(checkout.getSession(),
                        new SquareTxError(checkout.getOrderId(), SquareTxError.Code.Server, "offline"));
                }
            });
    }

    /**
     * User -> Server: Query for Operator Token
     * Server -> User: Token if
     *
     * @param query
     */
    @Subscribe
    @AllowConcurrentEvents
    public void onUTSQPaypalToken(final UTSQPaypalToken query) {
        if (StringUtils.isEmpty(query.getOperatorId())) {
            log.warn("received empty operatorId from {} {}", query.getSrc().getChannel(), query.getSrc().getId());
            return;
        }
        searchOnlineMember(new Identity(query.getOperatorId(), Channel.operator))
            .thenCompose(fetchClientToken(query))
            .whenComplete((token, exp) -> {
                if (exp != null) {
                    log.error("err processing " + query, exp);
                } else {
                    Utils.replyObjectMsg(query.getSession(), token);
                }
            });
    }

    private Function<OnlineMember, CompletionStage<UTSAPaypalToken>>
    fetchClientToken(final UTSQPaypalToken query) {
        UTSAPaypalToken answer = new UTSAPaypalToken(query);
        return operator -> CompletableFuture.completedFuture(
            Optional.ofNullable(operator.getPaypalAccessCode())
                .map(code -> BraintreePayments.fetchClientToken(code))
                .map(token -> {
                    answer.setSquare(operator.getSquareAppId());
                    answer.setToken(token);
                    answer.setAccessCode(HandlerUtils.encrypt(this.passwd, operator.getPaypalAccessCode()));
                    return answer;
                }).orElseGet(() -> {
                answer.setSquare(operator.getSquareAppId());
                return answer;
            })
        );
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onCheckout(final PaypalCheckout checkout) {
        buildCheckoutRequest(checkout)
            .thenCompose(BraintreePayments::sale)
            .thenCompose(mapToPaypalPayment())
            .thenCompose(updatePayment(checkout))
            .thenCompose(replyPayPalPaidToUser(checkout))
            .thenCombine(searchOnlineMember(toOperatorIdentify(checkout)), sendPaypalPaidToOperator())
            .whenComplete((paypalPaid, exp) -> {
                if (exp != null) {
                    if (exp instanceof MemberOffline) {
                        // Save Offline message to operator
                        asyncEventBus.post(new OfflineMessage(checkout.getOperatorId(),
                            PaypalPaid.class.getSimpleName(), 0, paypalPaid));
                    } else {
                        log.error("error process " + checkout, exp);
                        Utils.replyObjectMsg(checkout.getSession(), new PaypalTxError(checkout.getOrderId()));
                    }
                }
            });
    }

    private Function<PaypalPaid, CompletionStage<PaypalPaid>> replyPayPalPaidToUser(final PaypalCheckout checkout) {
        return paypalPaid -> {
            Utils.replyObjectMsg(checkout.getSession(), paypalPaid);
            return CompletableFuture.completedFuture(paypalPaid);
        };
    }

    private Function<BraintreePayment, CompletionStage<PaypalPayment>> mapToPaypalPayment() {
        return braintreePayment -> CompletableFuture.completedFuture(new PaypalPayment(braintreePayment));
    }

    private Function<PaypalPayment, CompletionStage<PaypalPaid>> updatePayment(final PaypalCheckout checkout) {
        return paypalPayment -> {
            UUID orderId = UUID.fromString(checkout.getOrderId());
            String customerId = checkout.getSrc().getId();
            String operatorId = checkout.getOperatorId();
            String payments = toString(paypalPayment);
            return updateOrdersPayments(payments, orderId, operatorId, customerId)
                .thenCompose(rs -> {
                    PaypalPaid paypalPaid = new PaypalPaid(operatorId);
                    paypalPaid.setSrc(new Identity(customerId, Channel.user));
                    paypalPaid.setOrderId(orderId.toString());
                    paypalPaid.setPayments(payments);
                    return CompletableFuture.completedFuture(paypalPaid);
                });
        };
    }

    private CompletableFuture<BraintreePayments.Request> buildCheckoutRequest(PaypalCheckout checkout) {
        return queryProfileName(checkout)
            .thenCompose(name -> CompletableFuture.completedFuture(
                BraintreePayments.Request.builder()
                    .accessToken(HandlerUtils.decrypt(this.passwd, checkout.getAccessCode()))
                    .nonce(checkout.getNonce())
                    .amount(checkout.getAmount())
                    .invoiceId(checkout.getOrderId())
                    .description(name + " purchase")
                    .name(toCreditCardDBAName(name))
                    .buyer(checkout.getSrc().getId())
                    .seller(checkout.getOperatorId())
                    .build()
            ));
    }

    private CompletableFuture<String> queryProfileName(PaypalCheckout checkout) {
        return execAsync(() -> profile.bind().setString("operatorId", checkout.getOperatorId()))
            .thenCompose(rs -> CompletableFuture.completedFuture(
                rs.all().stream()
                    .findFirst()
                    .map(row -> row.getString("name"))
                    .orElse("foodtruck")
                )
            );
    }

    private String toCreditCardDBAName(String name) {
        // Company name/DBA section must be either 3, 7 or 12 characters and the product descriptor can be
        // up to 18, 14, or 9 characters respectively (with an * in between for a total descriptor name of 22 characters)

        StringBuilder sb = new StringBuilder("foodtrk*");
        for (char c : name.toCharArray()) {
            if (Character.isLetterOrDigit(c)) {
                sb.append(c);
            }
            if (sb.length() >= 22) {
                break;
            }
        }

        return sb.toString();
    }

    private BiFunction<PaypalPaid, OnlineMember, PaypalPaid> sendPaypalPaidToOperator() {
        return (paypalPaid, onlineMember) -> {
            EmbeddedAeron.sendUniCast(onlineMember.getChannel(), onlineMember.getStreamId(), paypalPaid,
                new AeronIPC.OffLine(PaypalPaid.class.getSimpleName(), 0L), false)
                .whenComplete((pos, exp) -> {
                    if (exp != null) {
                        log.error("save offline, unable publish aeron " + paypalPaid, exp);
                        asyncEventBus.post(new OfflineMessage(paypalPaid.getDest().getId(),
                            PaypalPaid.class.getSimpleName(), 0, paypalPaid));
                    }
                });
            return paypalPaid;
        };
    }

    private String toString(PaypalPayment payment) {
        try {
            return new ObjectMapper().writeValueAsString(new Payment[]{payment});
        } catch (JsonProcessingException e) {
            log.error("error jsonfy " + payment, e);
            throw new RuntimeException(e);
        }
    }

    private Identity toOperatorIdentify(final PaypalCheckout checkout) {
        return new Identity(checkout.getOperatorId(), Channel.operator);
    }
}

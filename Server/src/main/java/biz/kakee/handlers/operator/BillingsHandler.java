package biz.kakee.handlers.operator;

import biz.kakee.Conf;
import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.request.common.paypal.BraintreePayment;
import biz.kakee.pvo.events.request.operator.PayBills;
import biz.kakee.pvo.events.request.operator.PreFlightCheckList;
import biz.kakee.pvo.events.request.operator.ViewBills;
import biz.kakee.pvo.events.request.operator.payments.PaypalClientToken;
import biz.kakee.pvo.events.request.user.payments.PaypalTxError;
import biz.kakee.pvo.events.response.operator.*;
import biz.kakee.utils.BraintreePayments;
import biz.kakee.utils.Crypto;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Row;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.utils.UUIDs;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.stream.Collectors;

import static java.time.temporal.ChronoUnit.DAYS;

@Slf4j
public class BillingsHandler extends CassandraEventHandler {
  private static final String UNDERSCORE = "_";
  private final String accessToken;
  private final PreparedStatement unpaidBills;
  private final PreparedStatement accounts;
  private final PreparedStatement updPayment;
  private final double commission;

  public BillingsHandler(Session session, Conf.PayPalConf.Env env, char[] passwd, double commission) {
    super(session);
    this.commission = commission;
    accessToken = Crypto.decryptWithPasswd(passwd, env.getAccessCode());

    unpaidBills = this.session.prepare("SELECT * FROM unpaid_bills WHERE operatorId = :operatorId ORDER BY end DESC");

    updPayment = this.session.prepare("UPDATE bills SET unpaid = null, paid = :paid, method = :instrumentType, " +
        "btTxId = :btTxId, payerEmail = :payerEmail, payerId = :payerId, payerFirstName = :payerFirstName, " +
        "payerLastName = :payerLastName, paymentId = :paymentId, authId = :authId " +
        "WHERE operatorId = :operatorId AND end = :end AND start = :start AND invoice = :invoice " +
        "IF unpaid = true AND payerEmail = null");

    accounts = session.prepare("SELECT * FROM accounts WHERE operatorId = :operatorId");
  }

  @Subscribe
  @AllowConcurrentEvents
  public void onPreFlightCheckList(final PreFlightCheckList preFlight) {
    String operatorId = preFlight.getSrc().getId();
    queryUnpaidBill(operatorId)
        .thenCombine(queryFreeTrialDaysRemaining(operatorId), prepareReturnMessage())
        .whenComplete((msg, exp) -> {
          if (exp != null) {
            log.error("unable " + preFlight, exp);
          } else {
            Utils.replyObjectMsg(preFlight.getSession(), msg);
          }
        });
  }

  private BiFunction<UnpaidBill, Long, Object> prepareReturnMessage() {
    return (bill, free) -> {
      if (free > 0) {
        return new FreeTrial(free);
      }
      return bill;
    };
  }

  private CompletableFuture<UnpaidBill> queryUnpaidBill(String operatorId) {
    return execAsync(() -> unpaidBills.bind().setString("operatorId", operatorId))
        .thenCompose(calcUnpaidBill());
  }

  private Function<ResultSet, CompletionStage<UnpaidBill>> calcUnpaidBill() {
    return rs -> CompletableFuture.completedFuture(
        rs.all().stream()
            .findFirst()
            .map(row -> mapToUnpaidBill(row))
            .orElse(new UnpaidBill(0, 0)));
  }

  private UnpaidBill mapToUnpaidBill(Row row) {
    long grace = row.getInt("grace") * DAYS.getDuration().getSeconds() * 1000L;
    return new UnpaidBill(row.getDouble("commission") + row.getDouble("ads"),
        UUIDs.unixTimestamp(row.getUUID("end")) + grace);
  }

  private CompletableFuture<Long> queryFreeTrialDaysRemaining(String operatorId) {
    return execAsync(() -> accounts.bind().setString("operatorId", operatorId))
        .thenCompose(rs -> CompletableFuture.completedFuture(rs.all().stream()
            .findFirst()
            .map(row -> calcFreeTrialDaysRemaining(row))
            .orElse(-1L)
        ));
  }

  private long calcFreeTrialDaysRemaining(Row row) {
    // expiry date is exclusive, so we need to add one more day
    Instant expiry = Instant.ofEpochMilli(UUIDs.unixTimestamp(row.getUUID("ts")))
        .plus(row.getInt("free") + 1, DAYS);
    return DAYS.between(Instant.now(), expiry);
  }

  @Subscribe
  @AllowConcurrentEvents
  public void onViewBills(final ViewBills viewBills) {
    execAsync(() -> unpaidBills.bind().setString("operatorId", viewBills.getSrc().getId()))
        .thenCompose(mapToBillPay())
        .whenComplete((billPay, exp) -> {
          if (exp != null) {
            log.error("view ", exp);
          } else {
            Utils.replyObjectMsg(viewBills.getSession(), billPay);
          }
        });
  }

  private Function<ResultSet, CompletionStage<BillPay>> mapToBillPay() {
    return rs -> {
      BillPay billPay = new BillPay();

      billPay.getBills().addAll(rs.all().stream()
          .map(row -> toBill(row))
          .collect(Collectors.toList()));
      return CompletableFuture.completedFuture(billPay);
    };
  }

  private Bill toBill(Row row) {
    Bill bill = new Bill(commission);
    UUID end = row.getUUID("end");
    UUID start = row.getUUID("start");
    bill.setId(end.toString() + UNDERSCORE + start);
    // pick middle point, Use javascript to report month
    bill.setMonth((UUIDs.unixTimestamp(end) + UUIDs.unixTimestamp(start)) / 2);
    bill.setInvoice(row.getString("invoice"));
    bill.setSales(row.getDouble("sales"));
    bill.setCommission(row.getDouble("commission"));
    bill.setAds(row.getDouble("ads"));
    return bill;
  }

  @Subscribe
  @AllowConcurrentEvents
  public void onClientToken(final PaypalClientToken clientToken) {
    try {
      clientToken.setToken(BraintreePayments.fetchClientToken(accessToken));
      clientToken.setTopic(PaypalClientToken.class.getSimpleName());
      Utils.replyObjectMsg(clientToken.getSession(), clientToken);
    } catch (Exception e) {
      log.error("fetch token " + clientToken, e);
    }
  }

  @Subscribe
  @AllowConcurrentEvents
  public void onPayBills(final PayBills payBills) {
    BraintreePayments.sale(buildPayPalRequest(payBills))
        .thenCompose(updatePayment(payBills))
        .whenComplete((billPaid, exp) -> {
          if (exp != null) {
            log.error(payBills + " error process ", exp);
            Utils.replyObjectMsg(payBills.getSession(), new PaypalTxError(payBills.getBillId()));
          } else {
            Utils.replyObjectMsg(payBills.getSession(), billPaid);
          }
        });
  }

  private Function<BraintreePayment, CompletionStage<BillPaid>> updatePayment(final PayBills payBills) {
    String[] ids = payBills.getBillId().split(UNDERSCORE);
    return payments -> execAsync(() -> updPayment.bind()
        .setString("operatorId", payBills.getSrc().getId())
        .setUUID("end", UUID.fromString(ids[0]))
        .setUUID("start", UUID.fromString(ids[1]))
        .setString("invoice", payBills.getInvoice())
        .set("paid", Instant.ofEpochMilli(payments.getPaid()), Instant.class)
        .setString("instrumentType", payments.getInstrumentType())
        .setString("btTxId", payments.getBtTxId())
        .setString("payerEmail", payments.getPayerEmail())
        .setString("payerId", payments.getPayerId())
        .setString("payerFirstName", payments.getPayerFirstName())
        .setString("payerLastName", payments.getPayerLastName())
        .setString("paymentId", payments.getPaymentId())
        .setString("authId", payments.getAuthId())
    ).thenCompose(rs -> CompletableFuture.completedFuture(
        new BillPaid(payBills.getBillId(), payments.getBtTxId(), rs.wasApplied())
    ));
  }

  private BraintreePayments.Request buildPayPalRequest(final PayBills payBills) {
    return BraintreePayments.Request.builder()
        .accessToken(accessToken)
        .nonce(payBills.getNonce())
        .amount(payBills.getAmount())
        .invoiceId(payBills.getInvoice())
        .description(payBills.getDesc())
        .name("tristonetech*kakee")
        .buyer(payBills.getSrc().getId())
        .seller("kakee")
        .build();
  }
}

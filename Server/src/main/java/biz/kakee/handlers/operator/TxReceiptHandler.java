package biz.kakee.handlers.operator;

import biz.kakee.db.CassandraEventHandler;
import biz.kakee.pvo.events.request.operator.PayPalTxInfo;
import biz.kakee.pvo.events.request.operator.SquareTxInfo;
import com.datastax.driver.core.BoundStatement;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.Session;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

@Slf4j
public class TxReceiptHandler extends CassandraEventHandler {
    private PreparedStatement updEmail;
    private PreparedStatement updPhone;
    private PreparedStatement updName;
    private PreparedStatement updPayPalTxInfo;
    private PreparedStatement updSquareTxInfo;
    private PreparedStatement updSquareOfflineTxInfo;

    public TxReceiptHandler(Session session) {
        super(session);

        updEmail = session.prepare("UPDATE paypal_customer_info SET email = :email WHERE " +
                "operatorId = :operatorId AND customerId = :customerId AND uid = :uid");

        updPhone = session.prepare("UPDATE paypal_customer_info SET phone = :phone WHERE " +
                "operatorId = :operatorId AND customerId = :customerId AND uid = :uid");

        updName = session.prepare("UPDATE paypal_customer_info SET name = :name WHERE " +
                "operatorId = :operatorId AND customerId = :customerId AND uid = :uid");

        updPayPalTxInfo = session.prepare("INSERT INTO paypal_tx_info (txId, orderId, operatorId, invId, uid, customerId, " +
                "correlationId, authId, authCode, receiptToken, handle, status) VALUES (:txId, :orderId, :operatorId, " +
                ":invId, :uid, :customerId, :correlationId, :authId, :authCode, :receiptToken, :handle, :status)");

        updSquareTxInfo = session.prepare("INSERT INTO square_tx_info (txId, orderId, operatorId, uid, clientTxId) " +
            " VALUES (:txId, :orderId, :operatorId, :uid, :clientTxId)");

        updSquareOfflineTxInfo = session.prepare("INSERT INTO square_offline_tx_info (clientTxId, orderId, operatorId," +
            "uid) VALUES (:clientTxId, :orderId, :operatorId, :uid)");
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onSquareTxInfo(final SquareTxInfo txInfo) {
        execAsync(() -> getSquareStmt(txInfo)
            .setString("orderId", txInfo.getOrderId())
            .setString("operatorId", txInfo.getSrc().getId())
            .setString("uid", toUID(txInfo.getUid()))
            .setString("clientTxId", txInfo.getClientTxId())
        ).whenComplete((rs, exp) -> {
            if (exp != null) {
                log.error("unable to save Square tx info" + txInfo, exp);
            }
        });
    }

    private BoundStatement getSquareStmt(SquareTxInfo txInfo) {
        return StringUtils.isEmpty(txInfo.getTxId()) ? updSquareOfflineTxInfo.bind() :
            updSquareTxInfo.bind().setString("txId", txInfo.getTxId());
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onPayPalyTxInfo(final PayPalTxInfo txInfo) {
        upddateCustomerContactInfo(txInfo);

        execAsync(() -> updPayPalTxInfo.bind()
                .setString("txId", txInfo.getTxId())
                .setString("orderId", txInfo.getOrderId())
                .setString("operatorId", txInfo.getSrc().getId())
                .setString("invId", txInfo.getInvId())
                .setString("uid", toUID(txInfo.getUid()))
                .setString("customerId", txInfo.getCustomer().getId())
                .setString("correlationId", txInfo.getCrlId())
                .setString("authId", txInfo.getAuthId())
                .setString("authCode", txInfo.getAuthCode())
                .setString("receiptToken", txInfo.getCustomer().getToken())
                .setString("handle", txInfo.getTxHandle())
                .setString("status", txInfo.getStatus())
        ).whenComplete((rx, exp) -> {
            if (exp != null) {
                log.error("unable to save paypal tx info" + txInfo, exp);
            }
        });
    }

    private void upddateCustomerContactInfo(PayPalTxInfo txInfo) {
        if (txInfo.getRptContact() != null) {
            BoundStatement stmt = getUpdateStmt(txInfo.getRptContact());
            if (stmt != null) {
                execAsync(() -> stmt
                        .setString("operatorId", txInfo.getSrc().getId())
                        .setString("customerId", txInfo.getCustomer().getId())
                        .setString("uid", toUID(txInfo.getUid()))
                ).whenComplete((rs, exp) -> {
                    if (exp != null) {
                        log.error("unable to update paypal contact phone/email" + txInfo, exp);
                    }
                });

                String name = txInfo.getCustomer().getName();
                if (StringUtils.isNotEmpty(name)) {
                    execAsync(() -> updName.bind()
                            .setString("operatorId", txInfo.getSrc().getId())
                            .setString("customerId", txInfo.getCustomer().getId())
                            .setString("name", name)
                            .setString("uid", toUID(txInfo.getUid()))
                    ).whenComplete((rs, exp) -> {
                        if (exp != null) {
                            log.error("unable to update paypal contact name " + txInfo, exp);
                        }
                    });
                }
            }
        }
    }

    private BoundStatement getUpdateStmt(PayPalTxInfo.Contact contact) {
        if (contact.getDest().contains("*")) {
            // this is masked email/phone don't update
            log.info("skip update contact info " + contact);
            return null;
        }

        if (contact.isEmail()) {
            return updEmail.bind().setString("email", contact.getDest());
        }

        return updPhone.bind().setString("phone", contact.getDest());
    }

    // uid is kakee user id
    private String toUID(String uid) {
        return StringUtils.isEmpty(uid) ? "OnSite" : uid;
    }
}

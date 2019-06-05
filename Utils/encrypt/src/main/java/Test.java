import biz.kakee.pvo.events.request.common.paypal.BraintreePayment;
import biz.kakee.pvo.events.request.common.paypal.Payment;
import biz.kakee.pvo.events.request.operator.payments.CashPayment;
import biz.kakee.pvo.events.request.user.payments.PaypalPayment;
import com.fasterxml.jackson.databind.ObjectMapper;

public class Test {
    public static void main(String[] argv) throws Exception {
        BraintreePayment bp = BraintreePayment.builder()
            .amount(230)
            .paid(2083)
            .build();

        PaypalPayment paypalPayment = new PaypalPayment(bp);

        deSe(paypalPayment);

        CashPayment cc = new CashPayment();
        cc.setPaid(283);
        cc.setTimestamp(83838);
        cc.setEmail("adfdjk");

        deSe(cc);
    }

    private static void deSe(Payment payment) throws Exception {
        String str = new ObjectMapper().writeValueAsString(new Payment[]{payment});

        System.out.println(str);

        System.out.println(new ObjectMapper().readValue(str, Payment[].class)[0]);
    }
}

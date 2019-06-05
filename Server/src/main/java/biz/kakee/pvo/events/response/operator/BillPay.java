package biz.kakee.pvo.events.response.operator;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class BillPay {
    private final String topic = BillPay.class.getSimpleName();

    private final List<Bill> bills = new ArrayList<>();
}

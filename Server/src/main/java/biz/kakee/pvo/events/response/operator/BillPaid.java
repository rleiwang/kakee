package biz.kakee.pvo.events.response.operator;

import lombok.Data;

@Data
public class BillPaid {
    private final String topic = BillPaid.class.getSimpleName();

    private final String id;
    private final String txId;
    private final boolean paid;
}

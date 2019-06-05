package biz.kakee.pvo.events.response.operator;

import lombok.Data;

@Data
public class UnpaidBill {
    private final String topic = UnpaidBill.class.getSimpleName();

    private final double amount;
    private final long dueDate;
}

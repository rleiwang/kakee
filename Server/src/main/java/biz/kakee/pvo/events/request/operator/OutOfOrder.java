package biz.kakee.pvo.events.request.operator;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class OutOfOrder extends Menu {
    private boolean updated;
}

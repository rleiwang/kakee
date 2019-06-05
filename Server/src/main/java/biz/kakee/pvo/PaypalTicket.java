package biz.kakee.pvo;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Pure Value Object
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class PaypalTicket extends User {
    private String clientId;
    private String url;
}

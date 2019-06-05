package biz.kakee.pvo.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class Account extends SignUpDevice {
    private String email;
    private String promotion_code;
    private int free;
    private int grace;
    private int tzOffset;
    private float latitude;
    private float longitude;
    private String postalCode;
}

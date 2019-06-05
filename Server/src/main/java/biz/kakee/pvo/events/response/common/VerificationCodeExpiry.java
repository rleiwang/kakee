package biz.kakee.pvo.events.response.common;

import lombok.Data;

@Data
public class VerificationCodeExpiry {
    private String topic = VerificationCodeExpiry.class.getSimpleName();

    private long expiry;
}

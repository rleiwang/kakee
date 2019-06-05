package biz.kakee.pvo.events.response.common;

import lombok.Data;

@Data
public class CodeVerification {
    private final String topic = CodeVerification.class.getSimpleName();
    private final boolean verified;
    private final boolean promoted;
    private boolean truckIdExists = true;
}

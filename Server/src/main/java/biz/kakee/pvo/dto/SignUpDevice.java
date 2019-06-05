package biz.kakee.pvo.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class SignUpDevice {
    private String iid;
    private String operatorId;
    private UUID ts;
}

package biz.kakee.pvo.events.request.operator;

import biz.kakee.pvo.events.request.common.Authorization;
import lombok.Data;

import java.util.function.Consumer;

@Data
public class ReConnected {
    private final String operatorId;
    private final Authorization authorization;
    private final Consumer<Boolean> onAuthorize;
}

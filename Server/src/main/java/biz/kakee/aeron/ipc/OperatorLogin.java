package biz.kakee.aeron.ipc;

import lombok.Data;

@Data
public class OperatorLogin implements IPC {
    private final String topic = OperatorLogin.class.getSimpleName();
    private final String channel;
    private final String id;
}

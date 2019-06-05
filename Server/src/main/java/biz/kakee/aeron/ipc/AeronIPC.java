package biz.kakee.aeron.ipc;

import biz.kakee.pvo.events.Identity;
import lombok.Data;

@Data
public class AeronIPC {

    @Data
    public static class OffLine {
        private final String topic;
        private final long expiry;
    }

    private final Identity target;
    private final Object payload;

    // if offline is not null, the message should be kept until recipient online
    private final OffLine offLine;

    // if true, after successfully posts the message to websocket, it will deserialize the payload
    // post an event in locally
    private final boolean ackSent;
}

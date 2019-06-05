package biz.kakee.pvo.events.request.common;

import lombok.Data;

/**
 * This is response sent to client that server is ready to process more messages
 */
@Data
public class Authorized {
    private String topic = Authorized.class.getSimpleName();
}

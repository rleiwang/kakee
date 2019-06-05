package biz.kakee.pvo.events.response;

import biz.kakee.pvo.events.Status;
import lombok.Data;

@Data
public class Reply {
    private final String topic = Reply.class.getSimpleName();

    private final Status status;
    private final long sequence;
    private String msg;
}

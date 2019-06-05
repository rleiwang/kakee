package biz.kakee.pvo.events;

import lombok.Data;

@Data
public class Error {
    private final Status status;
    private final String msg;
    private final String ref;
}

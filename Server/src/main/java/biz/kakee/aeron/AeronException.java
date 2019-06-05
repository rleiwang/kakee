package biz.kakee.aeron;

import lombok.Getter;

public class AeronException extends Exception {
    public enum Code {
        Unknown,
        NoSub,
        Busy,
        Admin,
        Closed
    }

    @Getter
    private final Code code;

    public AeronException(Code code) {
        super(code.name());
        this.code = code;
    }
}

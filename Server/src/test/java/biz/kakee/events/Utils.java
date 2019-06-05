package biz.kakee.events;

import java.util.concurrent.atomic.AtomicLong;

public class Utils {
    private static final AtomicLong seqNo = new AtomicLong(1);

    public static long nextSeqNo() {
        return seqNo.getAndAdd(2L);
    }
}

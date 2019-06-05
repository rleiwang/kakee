package biz.kakee.utils;

import java.lang.management.ManagementFactory;

public class OS {
    public static final int PID = getpid();

    private static int getpid() {
        return Integer.parseInt(ManagementFactory.getRuntimeMXBean().getName().split("@")[0]);
    }
}

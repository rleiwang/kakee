package com.tristonetech.kakee.User.gcm;

public class GCMToken {
    private static String TOKEN;

    public static void setTotken(String totken) {
        TOKEN = totken;
    }

    public static String getToken() {
        return TOKEN;
    }
}

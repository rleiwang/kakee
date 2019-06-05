package com.tristonetech.kakee.User.gcm;

import android.os.Bundle;

import java.util.ArrayList;
import java.util.List;

public abstract class Utils {
    public static final String REFRESHED_TOKEN = "com.user.gcm.GCMToken";
    public static final String NOTIFICATION = "com.user.gcm.GCMNotification";

    private volatile static List<Bundle> notifications = new ArrayList<>();

    public static List<Bundle> getNotifications() {
        List<Bundle> tmp = notifications;
        notifications = new ArrayList<>();
        return tmp;
    }

    public static void addNotification(Bundle payload) {
        notifications.add(payload);
    }
}

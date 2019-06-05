package com.tristonetech.kakee.User.gcm;

import android.app.ActivityManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.support.v4.app.NotificationCompat;

import com.google.android.gms.gcm.GcmListenerService;
import com.tristonetech.kakee.User.ExtMainActivity;
import com.tristonetech.kakee.User.R;

import java.util.List;

public class GCMListenerService extends GcmListenerService {
    private static final int ORANGE_COLOR = Color.parseColor("#FBBA3A");

    /**
     * Called when message is received.
     *
     * @param from SenderID of the sender.
     * @param data Data bundle containing message data as key/value pairs.
     *             For Set of keys use data.keySet().
     */
    // [START receive_message]
    @Override
    public void onMessageReceived(String from, Bundle data) {
        if (isAppOnBackground()) {
            // show a notification indicating to the user that a message was received.
            // if application is not in foreground
            Utils.addNotification(data);
            sendNotification(data);
        } else {
            Intent i = new Intent(Utils.NOTIFICATION);
            i.putExtra("payload", data);
            sendOrderedBroadcast(i, null);
        }
    }
    // [END receive_message]

    /**
     * Create and show a simple notification containing the received GCM message.
     *
     * @param payload GCM notification received.
     */
    private void sendNotification(Bundle payload) {
        Intent intent = new Intent(this, ExtMainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0 /* Request code */, intent,
                PendingIntent.FLAG_ONE_SHOT);

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this)
                .setContentTitle(payload.getString("title"))
                .setContentText(payload.getString("body"))
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setContentIntent(pendingIntent)
                .setLargeIcon(BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher));

        if (android.os.Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            notificationBuilder.setSmallIcon(R.mipmap.ic_launcher);
        } else {
            notificationBuilder.setSmallIcon(R.drawable.kakee_silhouette).setColor(ORANGE_COLOR);
        }

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        notificationManager.notify(0 /* ID of notification */, notificationBuilder.build());
    }

    private boolean isAppOnBackground() {
        ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);

        List<ActivityManager.RunningAppProcessInfo>
                appProcesses = activityManager.getRunningAppProcesses();
        if (appProcesses != null) {
            final String appPackageName = getApplicationInfo().processName;
            for (ActivityManager.RunningAppProcessInfo appProcess : appProcesses) {
                if (appProcess.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
                        && appProcess.processName.equals(appPackageName)) {
                    return false;
                }
            }
        }
        return true;
    }
}

package com.tristonetech.kakee.User.gcm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.RCTNativeAppEventEmitter;

public class GCMModule extends ReactContextBaseJavaModule {

    public GCMModule(ReactApplicationContext reactContext) {
        super(reactContext);
        registerTokenRefreshHandler(reactContext);
        registerMessageHandler(reactContext);
    }

    @Override
    public String getName() {
        return "GoogleCloudMessaging";
    }

    @ReactMethod
    public void fetchToken(final Promise promise) {
        promise.resolve(GCMToken.getToken());
    }

    @ReactMethod
    public void fetchNotifications(final Promise promise) {
        WritableArray array = Arguments.createArray();
        for (Bundle payload : Utils.getNotifications()) {
            array.pushMap(toWritableMap(payload));
        }
        promise.resolve(array);
    }

    private void registerTokenRefreshHandler(final ReactApplicationContext reactContext) {
        reactContext.registerReceiver(new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (reactContext.hasActiveCatalystInstance()) {
                    String token = intent.getStringExtra("token");
                    sendEvent(reactContext, "TokenRefreshed", token);
                    abortBroadcast();
                }
            }
        }, new IntentFilter(Utils.REFRESHED_TOKEN));
    }

    private void registerMessageHandler(final ReactApplicationContext reactContext) {
        reactContext.registerReceiver(new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (reactContext.hasActiveCatalystInstance()) {
                    Bundle payload = intent.getBundleExtra("payload");
                    if (payload != null) {
                        sendEvent(reactContext, "NotificationReceived", toWritableMap(payload));
                    }
                    abortBroadcast();
                }
            }
        }, new IntentFilter(Utils.NOTIFICATION));
    }

    private void sendEvent(ReactApplicationContext reactContext, String eventName, Object params) {
        reactContext.getJSModule(RCTNativeAppEventEmitter.class)
                .emit(eventName, params);
    }

    public WritableMap toWritableMap(Bundle payload) {
        WritableMap params = Arguments.createMap();
        params.putString("operatorId", payload.getString("operatorId"));
        params.putString("orderId", payload.getString("orderId"));
        params.putString("status", payload.getString("status"));
        return params;
    }
}

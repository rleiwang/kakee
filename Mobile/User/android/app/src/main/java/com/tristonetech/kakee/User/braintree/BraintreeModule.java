package com.tristonetech.kakee.User.braintree;

import android.app.Activity;
import android.content.Context;

import com.braintreepayments.api.BraintreeFragment;
import com.braintreepayments.api.PayPal;
import com.braintreepayments.api.exceptions.InvalidArgumentException;
import com.braintreepayments.api.interfaces.BraintreeCancelListener;
import com.braintreepayments.api.interfaces.BraintreeErrorListener;
import com.braintreepayments.api.interfaces.PaymentMethodNonceCreatedListener;
import com.braintreepayments.api.models.PayPalRequest;
import com.braintreepayments.api.models.PaymentMethodNonce;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

public class BraintreeModule extends ReactContextBaseJavaModule {

    private Context mActivityContext;

    public BraintreeModule(ReactApplicationContext reactContext, Context activityContext) {
        super(reactContext);
        this.mActivityContext = activityContext;
    }

    @Override
    public String getName() {
        return "Braintree";
    }

    @ReactMethod
    public void checkout(final ReadableMap json, final Promise promise) {
        try {
            final BraintreeFragment fragment = BraintreeFragment
                    .newInstance((Activity) mActivityContext, json.getString("token"));

            fragment.addListener(new PaymentMethodNonceCreatedListener() {
                @Override
                public void onPaymentMethodNonceCreated(PaymentMethodNonce paymentMethodNonce) {
                    removeFragment(fragment);
                    WritableMap map = Arguments.createMap();
                    map.putString("status", "success");
                    map.putString("nonce", paymentMethodNonce.getNonce());
                    map.putString("amount", json.getString("amount"));
                    map.putString("orderId", json.getString("orderId"));

                    promise.resolve(map);
                }
            });

            fragment.addListener(new BraintreeCancelListener() {
                @Override
                public void onCancel(int requestCode) {
                    // Use this to handle a canceled activity, if the given requestCode is important.
                    // You may want to use this callback to hide loading indicators, and prepare your UI for input
                    removeFragment(fragment);
                    WritableMap map = Arguments.createMap();
                    map.putString("status", "cancel");
                    map.putString("orderId", json.getString("orderId"));
                    promise.resolve(map);
                }
            });

            fragment.addListener(new BraintreeErrorListener() {
                @Override
                public void onError(Exception error) {
                    removeFragment(fragment);
                    promise.reject("tx_err", "tx_err", error);
                }
            });

            PayPalRequest request = new PayPalRequest(json.getString("amount")).currencyCode("USD");
            PayPal.requestOneTimePayment(fragment, request);
        } catch (InvalidArgumentException e) {
            promise.reject("tx_err", "tx_err", e);
        }
    }

    private void removeFragment(BraintreeFragment fragment) {
        ((Activity) mActivityContext).getFragmentManager()
                .beginTransaction().remove(fragment).commit();
    }
}

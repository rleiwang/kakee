package com.tristonetech.kakee.User.utils;

import android.util.Base64;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.tristonetech.kakee.User.R;

import java.io.InputStream;
import java.nio.charset.Charset;
import java.security.PublicKey;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.util.UUID;

import javax.crypto.Cipher;

public class UtilsModule extends ReactContextBaseJavaModule {
    private final PublicKey publicKey;

    public UtilsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        try {
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            InputStream is = getReactApplicationContext().getResources().openRawResource(R.raw.signed_cert);
            Certificate certificate = cf.generateCertificate(is);

            this.publicKey = certificate.getPublicKey();
        } catch (CertificateException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public String getName() {
        return "Utils";
    }

    @ReactMethod
    public void randomUUID(Promise promise) {
        promise.resolve(UUID.randomUUID().toString());
    }

    @ReactMethod
    public void encrypt(final String plainText, Promise promise) {
        try {
            Cipher rsaCipher = Cipher.getInstance("RSA/ECB/PKCS1Padding");
            rsaCipher.init(Cipher.ENCRYPT_MODE, publicKey);
            byte[] encrypted = rsaCipher.doFinal(plainText.getBytes(Charset.forName("UTF-8")));
            promise.resolve(Base64.encodeToString(encrypted, Base64.DEFAULT));
        } catch (Exception exp) {
            promise.reject("df", exp);
        }
    }
}

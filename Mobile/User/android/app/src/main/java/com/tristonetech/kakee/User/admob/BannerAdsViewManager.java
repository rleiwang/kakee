package com.tristonetech.kakee.User.admob;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;

public class BannerAdsViewManager extends SimpleViewManager<AdView> {

    @Override
    public String getName() {
        return "BannerAds";
    }

    @Override
    protected AdView createViewInstance(final ThemedReactContext reactContext) {
        final AdView adView = new AdView(reactContext);

        adView.setAdListener(new AdListener() {
            @Override
            public void onAdClosed() {
                super.onAdClosed();
            }

            @Override
            public void onAdFailedToLoad(int errorCode) {
                super.onAdFailedToLoad(errorCode);
            }

            @Override
            public void onAdLeftApplication() {
                super.onAdLeftApplication();
            }

            @Override
            public void onAdOpened() {
                super.onAdOpened();
            }

            @Override
            public void onAdLoaded() {
                super.onAdLoaded();

                int width = adView.getAdSize().getWidthInPixels(reactContext);
                int height = adView.getAdSize().getHeightInPixels(reactContext);
                int left = adView.getLeft();
                int top = adView.getTop();
                adView.measure(width, height);
                adView.layout(left, top, left + width, top + height);
            }
        });

        return adView;
    }

    @ReactProp(name = "adUnitID")
    public void setAdUnitID(final AdView adView, final String adUnitID) {
        adView.setAdSize(AdSize.SMART_BANNER);
        adView.setAdUnitId(adUnitID);
        adView.loadAd(new AdRequest.Builder().build());
    }
}

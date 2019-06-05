package com.tristonetech.kakee.User;

import com.AirMaps.AirPackage;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.oblador.vectoricons.VectorIconsPackage;
import com.tristonetech.kakee.User.admob.AdMobPackage;
import com.tristonetech.kakee.User.braintree.BraintreePackage;
import com.tristonetech.kakee.User.gcm.GCMPackage;
import com.tristonetech.kakee.User.utils.UtilsPackage;

import java.util.Arrays;
import java.util.List;

public class MainActivity extends ReactActivity {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "User";
    }

    /**
     * Returns whether dev mode should be enabled.
     * This enables e.g. the dev menu.
     */
    @Override
    protected boolean getUseDeveloperSupport() {
        return BuildConfig.DEBUG;
    }

    /**
     * A list of packages used by the app. If the app uses additional views
     * or modules besides the default ones, add more packages here.
     */
    @Override
    protected List<ReactPackage> getPackages() {
        return Arrays.asList(new MainReactPackage(),
                new RNDeviceInfo(), new VectorIconsPackage(), new GCMPackage(), new AdMobPackage(),
                new AirPackage(), new UtilsPackage(), new BraintreePackage(this));
    }
}

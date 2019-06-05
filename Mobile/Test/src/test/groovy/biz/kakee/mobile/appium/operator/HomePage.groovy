package biz.kakee.mobile.appium.operator

import io.appium.java_client.ios.IOSElement
import io.appium.java_client.pagefactory.iOSFindBy

class HomePage {
    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIAElement[5]")
    IOSElement management
}

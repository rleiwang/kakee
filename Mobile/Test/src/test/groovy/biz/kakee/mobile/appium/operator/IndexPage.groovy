package biz.kakee.mobile.appium.operator

import io.appium.java_client.ios.IOSElement
import io.appium.java_client.pagefactory.iOSFindBy

class IndexPage {
    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAStaticText[1]")
    IOSElement homepage;
}

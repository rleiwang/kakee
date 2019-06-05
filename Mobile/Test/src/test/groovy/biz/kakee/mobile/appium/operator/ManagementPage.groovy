package biz.kakee.mobile.appium.operator

import io.appium.java_client.ios.IOSElement
import io.appium.java_client.pagefactory.iOSFindBy

class ManagementPage {
    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAElement[1]")
    IOSElement homeButton

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAElement[3]")
    IOSElement taxSetup
}

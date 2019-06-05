package biz.kakee.mobile.appium.operator

import io.appium.java_client.ios.IOSElement
import io.appium.java_client.pagefactory.iOSFindBy

class TaxSetup extends ManagementPage {

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIAElement[1]")
    IOSElement addCity

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIAElement[2]")
    IOSElement save

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIATextField[1]")
    IOSElement city

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIATextField[2]")
    IOSElement tax
}

package biz.kakee.mobile.appium.operator

import io.appium.java_client.ios.IOSElement
import io.appium.java_client.pagefactory.iOSFindBy

class SavedAlertPage {

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAAlert[1]/UIACollectionView[1]/UIACollectionCell[1]/UIAButton[1]")
    IOSElement okButton
}

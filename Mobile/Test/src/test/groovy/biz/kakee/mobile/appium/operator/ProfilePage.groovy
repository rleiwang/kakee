package biz.kakee.mobile.appium.operator

import io.appium.java_client.ios.IOSElement
import io.appium.java_client.pagefactory.iOSFindBy

class ProfilePage extends ManagementPage {
    // Food Truck Name
    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIAStaticText[1]")
    IOSElement truckLabel

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIATextField[1]")
    IOSElement truckName

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIASwitch[1]")
    IOSElement american

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIASwitch[13]")
    IOSElement dollar

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIATextField[2]")
    IOSElement description

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIATextField[3]")
    IOSElement city

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIATextField[4]")
    IOSElement phone

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIATextField[5]")
    IOSElement website

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIATextField[6]")
    IOSElement twitter

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAScrollView[1]/UIATextField[7]")
    IOSElement facebook

    @iOSFindBy(xpath = "//UIAApplication[1]/UIAWindow[1]/UIAElement[9]")
    IOSElement saveProfile
}

package biz.kakee.mobile.appium.operator

import io.appium.java_client.ios.IOSDriver
import io.appium.java_client.ios.IOSElement
import io.appium.java_client.pagefactory.AppiumFieldDecorator
import org.openqa.selenium.Keys
import org.openqa.selenium.ScreenOrientation
import org.openqa.selenium.remote.DesiredCapabilities
import org.openqa.selenium.support.PageFactory
import spock.lang.Shared
import spock.lang.Specification

class OperatorSpec extends Specification {

    @Shared
    IOSDriver<IOSElement> driver

    @Shared
    IndexPage indexPage

    @Shared
    HomePage homePage

    @Shared
    SavedAlertPage savedAlert

    @Shared
    ProfilePage profilePage

    @Shared
    TaxSetup taxSetup

    def setupSpec() {
        File appDir = new File(System.getProperty("user.dir"), "../Operator/ios/build/sym/Debug-iphonesimulator")
        File app = new File(appDir, "kakee.app")
        DesiredCapabilities capabilities = new DesiredCapabilities()
        capabilities.setCapability("appium-version", "1.0");
        capabilities.setCapability("platformVersion", "9.2")
        capabilities.setCapability("deviceName", "iPad 2")
        capabilities.setCapability("app", app.getAbsolutePath())
        driver = new IOSDriver<IOSElement>(new URL("http://127.0.0.1:4723/wd/hub"), capabilities)
        driver.rotate(ScreenOrientation.LANDSCAPE)

        indexPage = new IndexPage()
        homePage = new HomePage()
        profilePage = new ProfilePage()
        savedAlert = new SavedAlertPage()
        taxSetup = new TaxSetup()
    }

    def cleanupSpec() {
        //driver.quit()
    }

    def "edit profile"() {
        given:
        PageFactory.initElements(new AppiumFieldDecorator(driver), indexPage)

        expect:
        indexPage.homepage.getText() == 'Homepage'

        when:
        driver.tap(1, indexPage.homepage, 1)

        and:
        PageFactory.initElements(new AppiumFieldDecorator(driver), homePage)

        then:
        driver.tap(1, homePage.management, 1)

        and:
        PageFactory.initElements(new AppiumFieldDecorator(driver), profilePage)

        expect:
        profilePage.truckLabel.getText() == "Food Truck Name"

        when:
        driver.tap(1, profilePage.truckName, 1)
        profilePage.truckName.sendKeys("Test Truck Name")
        profilePage.truckName.sendKeys(Keys.ENTER)

        and:
        driver.tap(1, profilePage.american, 1)

        and:
        driver.tap(1, profilePage.dollar, 1)

        and:
        driver.tap(1, profilePage.description, 1)
        profilePage.description.sendKeys("Test Desc" + Keys.ENTER)

        and:
        driver.tap(1, profilePage.city, 1)
        profilePage.city.sendKeys("San Jose" + Keys.ENTER)

        and:
        driver.tap(1, profilePage.phone, 1)
        profilePage.phone.sendKeys("(123)4567890" + Keys.ENTER)

        and:
        driver.tap(1, profilePage.website, 1)
        profilePage.website.sendKeys("localhost" + Keys.ENTER)

        and:
        driver.tap(1, profilePage.twitter, 1)
        profilePage.twitter.sendKeys("twitter" + Keys.ENTER)

        and:
        driver.tap(1, profilePage.facebook, 1)
        profilePage.facebook.sendKeys("facebook" + Keys.ENTER)

        then:
        driver.tap(1, profilePage.saveProfile, 1)
        PageFactory.initElements(new AppiumFieldDecorator(driver), savedAlert)

        expect:
        savedAlert.okButton.getText() == "OK"

        and:
        driver.tap(1, savedAlert.okButton, 1)

        and:
        driver.tap(1, profilePage.taxSetup, 1)
    }

    def "save tax"() {
        given:
        PageFactory.initElements(new AppiumFieldDecorator(driver), taxSetup)

        expect:
        taxSetup.addCity.getText().endsWith("Add City")

        when:
        driver.tap(1, taxSetup.addCity, 1)
        PageFactory.initElements(new AppiumFieldDecorator(driver), taxSetup)

        and:
        taxSetup.city.sendKeys("San Jose" + Keys.ENTER)

        and:
        taxSetup.tax.sendKeys("3.5" + Keys.ENTER)

        then:
        driver.tap(1, taxSetup.save, 1)

        expect:
        PageFactory.initElements(new AppiumFieldDecorator(driver), savedAlert)
        savedAlert.okButton.getText() == "OK"

        and:
        driver.tap(1, savedAlert.okButton, 1)
    }
}
# https://facebook.github.io/react-native/docs/signed-apk-android.html
# .gradle/gradle.properties
#KAKEE_RELEASE_STORE_FILE=kakee-release-key.keystore
#KAKEE_RELEASE_KEY_ALIAS=kakee
#AKEE_RELEASE_STORE_PASSWORD=<passwd>
#AKEE_RELEASE_KEY_PASSWORD=<passwd>
keytool -genkey -v -keystore kakee-release-key.keystore -alias kakee -keyalg RSA -keysize 2048 -validity 20000

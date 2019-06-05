package biz.kakee.pvo.paypal;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Assert;
import org.junit.Test;

import java.nio.file.Paths;

public class OAuthTokenTest {

    @Test
    public void testJackson() throws Exception {
        OAuthToken token = new ObjectMapper().readValue(
                Paths.get(OAuthTokenTest.class.getProtectionDomain().getCodeSource().getLocation().getPath(),
                        "../../resources/test/PayPalLoginResponse.json").toFile()
                , OAuthToken.class);
        Assert.assertNotNull(token);
    }

    public static void main(String[] argv) throws Exception {
        ApiKey key = new ApiKey();
        key.setClientId("id");
        key.setSecret("secret");

        System.out.println(new ObjectMapper().writeValueAsString(key));
    }
}
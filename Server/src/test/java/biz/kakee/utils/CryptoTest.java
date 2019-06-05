package biz.kakee.utils;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.Assert.assertEquals;

public class CryptoTest {
    @Test
    public void testEncryption() throws Exception {
        String password = "passwd" + System.currentTimeMillis();
        String msg = "a secret message " + System.currentTimeMillis();
        Crypto.Message secMsg = Crypto.encrypt(password.toCharArray(), msg.getBytes(StandardCharsets.UTF_8));

        String json = new ObjectMapper().writeValueAsString(secMsg);

        Crypto.Message revMsg = new ObjectMapper().readValue(json, Crypto.Message.class);

        byte[] readMsg = Crypto.decrypt(password.toCharArray(), revMsg);
        assertEquals(msg, new String(readMsg, StandardCharsets.UTF_8));
    }
}
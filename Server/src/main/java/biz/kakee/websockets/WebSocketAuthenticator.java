package biz.kakee.websockets;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ArrayUtils;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Slf4j
public class WebSocketAuthenticator {

    /**
     * use PKI to verify the client request
     *
     * @param token
     * @return
     */
    public static Optional<String> verify(byte[] token) {
        if (ArrayUtils.isNotEmpty(token)) {
            try {
                return Optional.of(PKICrypto.getInstance().decrypt(token));
            } catch (Exception e) {
                log.error("error to decrypt " + new String(token, StandardCharsets.UTF_8), e);
            }
        }
        return Optional.empty();
    }


    public static String encrypt(String token) {
        try {
            return PKICrypto.getInstance().encrypt(token);
        } catch (Exception e) {
            log.error("error to encrypt " + token, e);
        }
        return null;
    }
}

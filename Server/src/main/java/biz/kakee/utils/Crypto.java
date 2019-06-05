package biz.kakee.utils;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import sun.misc.BASE64Decoder;
import sun.misc.BASE64Encoder;

import javax.activity.InvalidActivityException;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;
import java.util.Base64;

@Slf4j
public class Crypto {
    @Data
    public static class Message {
        private String iv;
        private String msg;
        private String digest;
    }

    private static final String CIPHER = "AES/CBC/PKCS5Padding";
    private static final String DIGEST_ALGO = "SHA-256";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    // based 64
    public static String encryptWithPasswd(char[] password, String plainText) {
        return encryptWithPasswd(password, plainText.getBytes(StandardCharsets.UTF_8));
    }

    public static String encryptWithPasswd(char[] password, byte[] plainText) {
        try {
            Crypto.Message msg = Crypto.encrypt(password, plainText);
            return Base64.getEncoder().encodeToString(OBJECT_MAPPER.writeValueAsBytes(msg));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    // based 64
    public static String decryptWithPasswd(char[] password, String encoded) {
        return new String(decryptBytesWithPasswd(password, encoded), StandardCharsets.UTF_8);
    }

    public static byte[] decryptBytesWithPasswd(char[] password, String encoded) {
        try {
            Crypto.Message msg = OBJECT_MAPPER.readValue(Base64.getDecoder().decode(encoded), Crypto.Message.class);
            return Crypto.decrypt(password, msg);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public static Message encrypt(char[] password, byte[] msg) {
        try {
            Cipher cipher = Cipher.getInstance(CIPHER);
            cipher.init(Cipher.ENCRYPT_MODE, getKey(password));
            AlgorithmParameters params = cipher.getParameters();
            Message et = new Message();
            et.setIv(new BASE64Encoder().encode(params.getParameterSpec(IvParameterSpec.class).getIV()));
            System.out.println(et.getIv());
            et.setMsg(new BASE64Encoder().encode(cipher.doFinal(msg)));
            System.out.println(et.getMsg());
            et.setDigest(new BASE64Encoder().encode(MessageDigest.getInstance(DIGEST_ALGO).digest(msg)));
            System.out.println(et.getDigest());
            return et;
        } catch (Exception e) {
            log.error("unable to encrypt", e);
            throw new RuntimeException(e);
        }
    }

    public static byte[] decrypt(char[] password, Message cryptMsg) {
        try {
            Cipher cipher = Cipher.getInstance(CIPHER);
            cipher.init(Cipher.DECRYPT_MODE, getKey(password),
                    new IvParameterSpec(new BASE64Decoder().decodeBuffer(cryptMsg.getIv())));
            byte[] msg = cipher.doFinal(new BASE64Decoder().decodeBuffer(cryptMsg.getMsg()));
            byte[] digest = MessageDigest.getInstance(DIGEST_ALGO).digest(msg);
            if (!cryptMsg.getDigest().equals(new BASE64Encoder().encode(digest))) {
                throw new InvalidActivityException("The digest of message doesn't match");
            }
            return msg;
        } catch (Exception e) {
            log.error("unable to decrypt", e);
            throw new RuntimeException(e);
        }
    }

    private static SecretKey getKey(char[] password) throws NoSuchAlgorithmException, InvalidKeySpecException {
        // "PBKDF2WithHmacSHA256" Java 8
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA1");
        KeySpec spec = new PBEKeySpec(password, new String(password).getBytes(StandardCharsets.UTF_8), 65536, 256);
        SecretKey tmp = factory.generateSecret(spec);
        return new SecretKeySpec(tmp.getEncoded(), "AES");
    }
}

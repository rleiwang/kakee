package biz.kakee.websockets;

import javax.crypto.Cipher;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

public class PKICrypto {
    private final PrivateKey privateKey;
    private final PublicKey publicKey;

    private static final PKICrypto INSTANCE = new PKICrypto(
            Paths.get("conf", "private_key.der"), Paths.get("conf", "public_key.der"));

    public static PKICrypto getInstance() {
        return INSTANCE;
    }

    //
    public String decrypt(byte[] cipher) throws Exception {
        Cipher decrypt = Cipher.getInstance("RSA/ECB/PKCS1Padding");
        decrypt.init(Cipher.DECRYPT_MODE, this.privateKey);

        // base64 encoded data on android/ios platform
        //byte[] cipher = Base64.getMimeDecoder().decode(base64Cipher);
        return new String(decrypt.doFinal(cipher), StandardCharsets.UTF_8);
    }

    public String encrypt(String plain) throws Exception {
        Cipher encrypt = Cipher.getInstance("RSA/ECB/PKCS1Padding");
        encrypt.init(Cipher.ENCRYPT_MODE, this.publicKey);

        byte[] cipher = encrypt.doFinal(plain.getBytes(StandardCharsets.UTF_8));
        return Base64.getMimeEncoder().encodeToString(cipher);
    }

    private PKICrypto(Path privateKey, Path publicKey) {
        try {
            this.privateKey = getPrivateKey(privateKey);
            this.publicKey = getPublicKey(publicKey);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    // private key file in DER format
    private PrivateKey getPrivateKey(Path privateKey) throws Exception {
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(Files.readAllBytes(privateKey));
        return KeyFactory.getInstance("RSA").generatePrivate(keySpec);
    }

    private PublicKey getPublicKey(Path publicKey) throws Exception {
        X509EncodedKeySpec spec = new X509EncodedKeySpec(Files.readAllBytes(publicKey));
        return KeyFactory.getInstance("RSA").generatePublic(spec);
    }
}

package biz.kakee.resources.auth.jwt;

import biz.kakee.Conf;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Optional;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.Principal;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.text.ParseException;

@Slf4j
public class JWTService<P extends Principal> {
  private static final String ClaimKey = "ck";

  private final RSAPrivateKey privateKey;
  private final RSAPublicKey publicKey;
  private final Class<P> clz;

  private final ObjectMapper jsonMapper = new ObjectMapper();

  public JWTService(Conf conf, Class<P> clz) throws NoSuchAlgorithmException, InvalidKeySpecException, IOException {
    privateKey = getPrivateKey();
    publicKey = getpublicKey();
    this.clz = clz;
  }

  public String sign(final P obj) throws JOSEException {
    SignedJWT signedJWT = new SignedJWT(
        new JWSHeader(JWSAlgorithm.RS256),
        new JWTClaimsSet.Builder()
            .claim(ClaimKey, obj).build());

    // Compute the RSA signature with private key
    signedJWT.sign(new RSASSASigner(privateKey));
    return signedJWT.serialize();
  }

  public Optional<P> verify(final String token) {
    try {
      // parse the JWS and verify its RSA signature with public key
      SignedJWT signedJWT = SignedJWT.parse(token);

      if (signedJWT.verify(new RSASSAVerifier(publicKey))) {
        return Optional.of(jsonMapper.readValue(signedJWT.getJWTClaimsSet()
            .getClaim(ClaimKey).toString(), clz));
      }
    } catch (ParseException | JOSEException | IOException e) {
    }
    return Optional.absent();
  }

  private RSAPrivateKey getPrivateKey() throws NoSuchAlgorithmException, InvalidKeySpecException, IOException {
    PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(Files.readAllBytes(Paths.get("conf", "private_key.der")));

    return (RSAPrivateKey)
        KeyFactory.getInstance("RSA").generatePrivate(keySpec);
  }

  private RSAPublicKey getpublicKey() throws NoSuchAlgorithmException, InvalidKeySpecException, IOException {
    X509EncodedKeySpec keySpec = new X509EncodedKeySpec(Files.readAllBytes(Paths.get("conf", "public_key.der")));
    return (RSAPublicKey)
        KeyFactory.getInstance("RSA").generatePublic(keySpec);
  }
}

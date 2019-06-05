package biz.kakee.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import lombok.Data;
import org.junit.Test;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;

public class JWTTester {
    @Data
    public static class SessionToken {
        private String field1;
        private long expiration;
    }

    private RSAPrivateKey getPrivateKey() throws Exception {
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(Files.readAllBytes(Paths.get("private_key.der")));

        return (RSAPrivateKey)
                KeyFactory.getInstance("RSA").generatePrivate(keySpec);
    }

    private RSAPublicKey getpublicKey() throws Exception {
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(Files.readAllBytes(Paths.get("public_key.der")));
        return (RSAPublicKey)
                KeyFactory.getInstance("RSA").generatePublic(keySpec);
    }

    @Test
    public void testBasic() throws Exception {
        //Jwts.builder().setSubject()
        // RSA signatures require a public and private RSA key pair, the public key
// must be made known to the JWS recipient in order to verify the signatures
        //KeyPairGenerator keyGenerator = KeyPairGenerator.getInstance("RSA");
        //keyGenerator.initialize(1024);

        //KeyPair kp = keyGenerator.genKeyPair();
        //RSAPublicKey publicKey = (RSAPublicKey) kp.getPublic();
        //RSAPrivateKey privateKey = (RSAPrivateKey) kp.getPrivate();


// Create RSA-signer with the private key
        JWSSigner signer = new RSASSASigner(getPrivateKey());

// Prepare JWT with claims set
        SessionToken claims = new SessionToken();
        claims.setExpiration(10L);
        claims.setField1("field1");
        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .claim("jwt", claims).build();

        SignedJWT signedJWT = new SignedJWT(
                new JWSHeader(JWSAlgorithm.RS256),
                claimsSet);

// Compute the RSA signature
        signedJWT.sign(signer);

// To serialize to compact form, produces something like
// eyJhbGciOiJSUzI1NiJ9.SW4gUlNBIHdlIHRydXN0IQ.IRMQENi4nJyp4er2L
// mZq3ivwoAjqa1uUkSBKFIX7ATndFF5ivnt-m8uApHO4kfIFOrW7w2Ezmlg3Qd
// maXlS9DhN0nUk_hGI3amEjkKd0BWYCB8vfUbUv0XGjQip78AI4z1PrFRNidm7
// -jPDm5Iq0SZnjKjCNS5Q15fokXZc8u0A
        String s = signedJWT.serialize();

// On the consumer side, parse the JWS and verify its RSA signature
        signedJWT = SignedJWT.parse(s);

        JWSVerifier verifier = new RSASSAVerifier(getpublicKey());
        if (signedJWT.verify(verifier)) {
            SessionToken st = new ObjectMapper().readValue(signedJWT.getJWTClaimsSet().getClaim("jwt").toString(),
                    SessionToken.class);
            System.out.println(st);
        }

// Retrieve / verify the JWT claims according to the app requirements
        //assertEquals("alice", signedJWT.getJWTClaimsSet().getSubject());
        //assertEquals("https://c2id.com", signedJWT.getJWTClaimsSet().getIssuer());
        //assertTrue(new Date().before(signedJWT.getJWTClaimsSet().getExpirationTime());
        //HttpHeaders.AUTHORIZATION
        //HttpAuthenticationFeature
    }
}

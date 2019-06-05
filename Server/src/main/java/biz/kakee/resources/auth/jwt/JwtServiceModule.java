package biz.kakee.resources.auth.jwt;

import biz.kakee.Conf;
import biz.kakee.pvo.User;
import dagger.Module;
import dagger.Provides;
import lombok.extern.slf4j.Slf4j;

import javax.inject.Singleton;
import java.io.IOException;
import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;

@Slf4j
@Module
public class JwtServiceModule {

    private final JWTService<User> jwtService;

    public JwtServiceModule(Conf conf)
            throws NoSuchAlgorithmException, IOException, InvalidKeySpecException {
        jwtService = new JWTService<>(conf, User.class);
    }

    @Singleton
    @Provides
    public JWTService<User> provide() {
        return jwtService;
    }
}

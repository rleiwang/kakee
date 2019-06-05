package biz.kakee.resources.auth;

import biz.kakee.db.Cassandra;
import biz.kakee.pvo.User;
import biz.kakee.resources.auth.jwt.JWTService;
import biz.kakee.resources.auth.operators.OperatorAuthenticator;
import com.google.common.base.Optional;
import io.dropwizard.auth.AuthenticationException;
import io.dropwizard.auth.Authenticator;
import io.dropwizard.auth.Authorizer;
import io.dropwizard.auth.basic.BasicCredentialAuthFilter;

import javax.annotation.security.PermitAll;
import javax.inject.Inject;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.container.DynamicFeature;
import javax.ws.rs.container.ResourceInfo;
import javax.ws.rs.core.FeatureContext;
import javax.ws.rs.core.SecurityContext;
import javax.ws.rs.ext.Provider;

@Provider
public class AuthFeatures implements DynamicFeature {

    private final ContainerRequestFilter basicAuthFilter;
    private final ContainerRequestFilter jwtAuthFilter;

    @Inject
    public AuthFeatures(final Cassandra cassandra, final JWTService<User> jwtService) {
        basicAuthFilter = new BasicCredentialAuthFilter.Builder<User>()
                .setAuthenticator(new OperatorAuthenticator(cassandra))
                .setRealm(SecurityContext.BASIC_AUTH)
                .buildAuthFilter();
        jwtAuthFilter = new JWTAuthFilter.Builder<User>()
                .setAuthenticator(new Authenticator<String, User>() {
                    @Override
                    public Optional<User> authenticate(String credentials) throws AuthenticationException {
                        return jwtService.verify(credentials);
                    }
                })
                .setAuthorizer(new Authorizer<User>() {
                    @Override
                    public boolean authorize(User principal, String role) {
                        try {
                            return principal.getRoles().contains(User.Role.valueOf(role));
                        } catch (Exception e) {
                        }
                        return false;
                    }
                })
                .buildAuthFilter();
    }

    @Override
    public void configure(ResourceInfo resourceInfo, FeatureContext context) {
        if (resourceInfo.getResourceMethod().isAnnotationPresent(Login.class)) {
            context.register(basicAuthFilter);
        } else if (!resourceInfo.getResourceMethod().isAnnotationPresent(PermitAll.class)) {
            context.register(jwtAuthFilter);
        }
    }
}
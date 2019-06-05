package biz.kakee.resources.auth;


import biz.kakee.pvo.User;
import lombok.extern.slf4j.Slf4j;
import org.glassfish.hk2.api.ServiceLocator;
import org.glassfish.jersey.server.internal.inject.AbstractContainerRequestValueFactory;
import org.glassfish.jersey.server.internal.inject.AbstractValueFactoryProvider;
import org.glassfish.jersey.server.internal.inject.MultivaluedParameterExtractorProvider;
import org.glassfish.jersey.server.internal.inject.ParamInjectionResolver;
import org.glassfish.jersey.server.model.Parameter;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.security.Principal;

@Singleton
@Slf4j
public class AuthUserProvider extends AbstractValueFactoryProvider {

    @Inject
    public AuthUserProvider(MultivaluedParameterExtractorProvider mpep, ServiceLocator locator) {
        super(mpep, locator, Parameter.Source.UNKNOWN);
    }

    @Singleton
    public static final class InjectionResolver extends ParamInjectionResolver<AuthUser> {
        public InjectionResolver() {
            super(AuthUserProvider.class);
        }
    }

    private static final class UserInfoFactory extends AbstractContainerRequestValueFactory<User> {

        @Override
        public User provide() {
            final Principal principal = getContainerRequest().getSecurityContext().getUserPrincipal();
            log.info("Providing user info: {}", principal);
            return (User) principal;
        }
    }

    @Override
    protected AbstractContainerRequestValueFactory<?> createValueFactory(Parameter parameter) {
        return new UserInfoFactory();
    }
}

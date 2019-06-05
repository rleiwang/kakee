package biz.kakee.resources.auth;

import biz.kakee.pvo.User;
import io.dropwizard.auth.AuthFilter;
import io.dropwizard.auth.basic.BasicCredentials;
import lombok.extern.slf4j.Slf4j;

import javax.annotation.Priority;
import javax.ws.rs.Priorities;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.PreMatching;
import javax.ws.rs.core.SecurityContext;
import java.io.IOException;
import java.security.Principal;

/**
 * http://www.programcreek.com/java-api-examples/index.php?source_dir=keycloak-dropwizard-integration-master/keycloak-dropwizard-jaxrs/src/main/java/de/ahus1/keycloak/dropwizard/KeycloakAuthFilter.java
 */
@PreMatching
@Priority(Priorities.AUTHENTICATION)
@Slf4j
public class OperatorAuthFilter extends AuthFilter<BasicCredentials, User> {

    @Override
    public void filter(final ContainerRequestContext ctx) throws IOException {
        ctx.setSecurityContext(new SecurityContext() {
            @Override
            public Principal getUserPrincipal() {
                return new User();
            }

            @Override
            public boolean isUserInRole(String role) {
                return true;
            }

            @Override
            public boolean isSecure() {
                return ctx.getSecurityContext().isSecure();
            }

            @Override
            public String getAuthenticationScheme() {
                return SecurityContext.BASIC_AUTH;
            }
        });
    }
}

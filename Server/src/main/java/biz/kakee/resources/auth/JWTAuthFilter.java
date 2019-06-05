package biz.kakee.resources.auth;

import com.google.common.base.Optional;
import io.dropwizard.auth.AuthFilter;
import io.dropwizard.auth.AuthenticationException;
import lombok.extern.slf4j.Slf4j;

import javax.annotation.Priority;
import javax.ws.rs.Priorities;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.SecurityContext;
import java.io.IOException;
import java.security.Principal;
import java.util.UUID;

@Priority(Priorities.AUTHENTICATION)
@Slf4j
public class JWTAuthFilter<P extends Principal> extends AuthFilter<String, P> {
    @Override
    public void filter(final ContainerRequestContext requestContext) throws IOException {
        final String header = requestContext.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (header == null) {
            throw new WebApplicationException(unauthorizedHandler.buildResponse(prefix, realm));
        }

        final int space = header.indexOf(' ');
        if (space <= 0 || !"Bearer".equals(header.substring(0, space))) {
            throw new WebApplicationException(Response.status(Response.Status.BAD_REQUEST)
                    .entity("bad formed " + HttpHeaders.AUTHORIZATION)
                    .build());
        }

        try {
            final Optional<P> principal = authenticator.authenticate(header.substring(space + 1));
            if (!principal.isPresent()) {
                throw new WebApplicationException(Response.status(Response.Status.FORBIDDEN).build());
            }

            requestContext.setSecurityContext(new SecurityContext() {
                @Override
                public Principal getUserPrincipal() {
                    return principal.get();
                }

                @Override
                public boolean isUserInRole(String role) {
                    return authorizer.authorize(principal.get(), role);
                }

                @Override
                public boolean isSecure() {
                    return requestContext.getSecurityContext().isSecure();
                }

                @Override
                public String getAuthenticationScheme() {
                    return "JWT";
                }
            });
        } catch (AuthenticationException e) {
            String uuid = UUID.randomUUID().toString();
            log.error(uuid, e);
            throw new WebApplicationException(Response.serverError().entity(uuid).build());
        }
    }

    public static class Builder<P extends Principal>
            extends AuthFilterBuilder<String, P, JWTAuthFilter<P>> {

        @Override
        protected JWTAuthFilter<P> newInstance() {
            return new JWTAuthFilter<>();
        }
    }
}

package biz.kakee.resources.auth.operators;

import biz.kakee.db.Cassandra;
import biz.kakee.pvo.User;
import com.google.common.base.Optional;
import io.dropwizard.auth.AuthenticationException;
import io.dropwizard.auth.Authenticator;
import io.dropwizard.auth.basic.BasicCredentials;

import javax.inject.Inject;

public class OperatorAuthenticator implements Authenticator<BasicCredentials, User> {

    private final Cassandra cassandra;

    @Inject
    public OperatorAuthenticator(Cassandra cassandra) {
        this.cassandra = cassandra;
    }

    @Override
    public Optional<User> authenticate(BasicCredentials credentials) throws AuthenticationException {
        String username = credentials.getUsername();
        String password = credentials.getPassword();
        User operator = new User();
        operator.setId("dfjdifjdifj");
        operator.getRoles().add(User.Role.OPERATOR);

        return Optional.of(operator);
    }
}

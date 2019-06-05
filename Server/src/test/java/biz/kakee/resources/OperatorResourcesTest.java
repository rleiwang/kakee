package biz.kakee.resources;

import biz.kakee.Conf;
import biz.kakee.Main;
import io.dropwizard.testing.junit.DropwizardAppRule;
import org.glassfish.jersey.client.authentication.HttpAuthenticationFeature;
import org.junit.ClassRule;
import org.junit.Test;

import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.CoreMatchers.notNullValue;
import static org.junit.Assert.assertThat;

public class OperatorResourcesTest {
    // same as gradle $buildDir
    private static Path BuildDir = Paths.get(OperatorResources.class.getProtectionDomain()
            .getCodeSource().getLocation().getPath()).getParent().getParent();

    @ClassRule
    public static final DropwizardAppRule<Conf> RULE =
            new DropwizardAppRule<>(Main.class, BuildDir.resolve("resources/main/config.yml").toString());

    @Test
    public void testGetMenu() throws Exception {
        URI menuURI = URI.create(String.format("http://localhost:%d/operators/adfdf/menu", RULE.getLocalPort()));

        Response response = ClientBuilder.newClient().target(menuURI).request().post(Entity.entity("{}", MediaType.APPLICATION_JSON),
                Response.class);


        response = ClientBuilder.newClient().target(menuURI).request().get(Response.class);

        System.out.println();
    }

    @Test
    public void testLogin() throws Exception {
        URI loginURI = URI.create(String.format("http://localhost:%d/operators/login", RULE.getLocalPort()));

        Response response = ClientBuilder.newClient().target(loginURI).request().get(Response.class);
        assertThat("", response.getStatus(), is(Response.Status.UNAUTHORIZED.getStatusCode()));

        response = ClientBuilder.newClient().target(loginURI)
                .register(HttpAuthenticationFeature.basicBuilder().build())
                .request()
                .property(HttpAuthenticationFeature.HTTP_AUTHENTICATION_BASIC_USERNAME, "user")
                .property(HttpAuthenticationFeature.HTTP_AUTHENTICATION_BASIC_PASSWORD, "pass")
                .get(Response.class);

        assertThat("", response.getStatus(), is(Response.Status.NO_CONTENT.getStatusCode()));
        assertThat("", response.getHeaderString(HttpHeaders.AUTHORIZATION), notNullValue());
    }
}
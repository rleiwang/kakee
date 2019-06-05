package biz.kakee.resources.paypal;

import biz.kakee.Conf;
import biz.kakee.pvo.paypal.ApiKey;
import biz.kakee.pvo.paypal.OAuthToken;
import biz.kakee.utils.Crypto;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.glassfish.jersey.client.authentication.HttpAuthenticationFeature;

import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.core.Form;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriBuilder;
import java.io.IOException;
import java.net.URI;
import java.util.Optional;

@Slf4j
public class OAuthClient {

  @Getter
  private final ApiKey apiKey;
  private final URI tokenServiceUri;

  public OAuthClient(Conf.PayPalConf.Env env, char[] passwd) {
    try {
      apiKey = new ObjectMapper().readValue(Crypto.decryptWithPasswd(passwd, env.getApiKey()), ApiKey.class);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
    tokenServiceUri = UriBuilder.fromUri(env.getApiURI())
        .path("/v1/identity/openidconnect/tokenservice").build();
  }

  public Optional<OAuthToken> validate(String code) {
    Form form = new Form();
    form.param("grant_type", "authorization_code");
    form.param("code", code);
    return retrieveTokenFromPayPal(form);
  }

  public Optional<OAuthToken> refresh(String scopes, String refreshToken) {
    Form form = new Form();
    form.param("grant_type", "refresh_token");
    form.param("refresh_token", refreshToken);
    form.param("scope", scopes);

    return retrieveTokenFromPayPal(form);
  }

  private Optional<OAuthToken> retrieveTokenFromPayPal(Form form) {
    HttpAuthenticationFeature auth = HttpAuthenticationFeature.basic(apiKey.getClientId(), apiKey.getSecret());
    Response response = ClientBuilder.newClient()
        .register(auth)
        .target(tokenServiceUri)
        .request(MediaType.APPLICATION_JSON)
        .post(Entity.entity(form, MediaType.APPLICATION_FORM_URLENCODED_TYPE));

    if (response.getStatus() == Response.Status.OK.getStatusCode()) {
      String responseString = response.readEntity(String.class);

      try {
        return Optional.of(new ObjectMapper().readValue(responseString, OAuthToken.class));
      } catch (IOException e) {
        log.error("unable to parse paypal oauth response " + responseString, e);
      }
    } else {
      log.error(form + " got error response " + response);
    }

    throw new RuntimeException("error ");
  }
}

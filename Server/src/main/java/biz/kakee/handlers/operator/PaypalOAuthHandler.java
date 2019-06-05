package biz.kakee.handlers.operator;

import biz.kakee.Conf;
import biz.kakee.db.CassandraEventHandler;
import biz.kakee.handlers.HandlerUtils;
import biz.kakee.pvo.Env;
import biz.kakee.pvo.events.request.operator.PaypalLoginURL;
import biz.kakee.pvo.events.request.operator.PaypalRefresh;
import biz.kakee.pvo.events.request.operator.PaypalValidation;
import biz.kakee.pvo.events.response.operator.PayPalLoginError;
import biz.kakee.pvo.events.response.operator.PaypalToken;
import biz.kakee.pvo.paypal.AccessToken;
import biz.kakee.pvo.paypal.OAuthToken;
import biz.kakee.resources.paypal.OAuthClient;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.Session;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.client.utils.URLEncodedUtils;

import javax.ws.rs.core.UriBuilder;
import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
public class PaypalOAuthHandler extends CassandraEventHandler {
  private final long EXPIRY_10_SECONDS = 10L;
  private final URI validateURI;
  private final URI loginServiceUri;
  private final String scopes;

  private final OAuthClient oAuthClient;
  private final char[] passwd;

  public PaypalOAuthHandler(Session session, Conf.PayPalConf.Env env, char[] passwd) {
    super(session);
    this.passwd = passwd;

    URI localUri = UriBuilder.fromUri(env.getLocalURI()).path("paypal").build();
    validateURI = UriBuilder.fromUri(localUri).path("validate").build();

    StringBuilder sb = new StringBuilder();
    for (String strVal : env.getScopes()) {
      if (sb.length() > 0) {
        sb.append(" ");
      }
      sb.append(strVal);
    }
    scopes = sb.toString();
    oAuthClient = new OAuthClient(env, passwd);
    loginServiceUri = UriBuilder.fromUri(env.getOauthURI())
        .path("/auth/protocol/openidconnect/v1/authorize")
        .queryParam("scope", scopes)
        .queryParam("response_type", "code")
        .queryParam("client_id", oAuthClient.getApiKey().getClientId())
        .build();
  }

  @Subscribe
  @AllowConcurrentEvents
  public void onRefresh(final PaypalRefresh refresh) {
    String refreshToken = HandlerUtils.decrypt(this.passwd, refresh.getToken());
    if (StringUtils.isEmpty(refreshToken)) {
      refresh.getResponse().cancel();
      return;
    }

    Optional<OAuthToken> oAuthToken = oAuthClient.refresh(scopes, refreshToken);
    if (oAuthToken.isPresent()) {
      OAuthToken token = oAuthToken.get();
      // refresh will only return expiry and access token
      AccessToken accessToken = new AccessToken();
      accessToken.setExpires(Env.isProd ? token.getExpires() : EXPIRY_10_SECONDS);
      accessToken.setRefreshURL(refresh.getRequestURL());
      accessToken.setAccessToken(token.getAccessToken());

      log.info("refresh access token " + accessToken);
      refresh.getResponse().resume(accessToken);
    } else {
      refresh.getResponse().cancel();
    }
  }

  @Subscribe
  @AllowConcurrentEvents
  public void onValidation(final PaypalValidation validation) {
    URI uri = URI.create(validation.getValidationURL());
    Map<String, String> params = null;
    try {
      params = URLEncodedUtils.parse(uri, StandardCharsets.UTF_8.name()).stream()
          .collect(Collectors.toMap(
              nvp -> nvp.getName(),
              nvp -> nvp.getValue()
          ));

      // on error
      // http://192.168.2.9:9190/paypal/validate?state=oid1343&
      // error_uri=http%3A%2F%2F192.168.2.9%3A9190%2Fpaypal%2Fvalidate%3Fstate%3Doid1343&
      // error_description=Authentication%20failed&error=access_denied'

      // on success
      // http://192.168.2.9:9190/paypal/validate?state=oid1343&
      // code=C101.z8gK6BEuaZDWb6sH6wFRAIzfFIRfMan1ZOL1mNXVYftKXkxjkvAVPpiKfYuVHp9b.ModWgvIJqA46ozoF7Wh1vyCXnIS&
      // scope=https%3A%2F%2Furi.paypal.com%2Fservices%2Fpaypalattributes%2Fbusiness%20phone%20https%3A%2F%2Furi.paypal.com%2Fservices%2Fpaypalhere%20address%20email%20openid%20profile'

      final String code = params.get("code");
      if (code != null) {
        oAuthClient.validate(params.get("code"))
            .ifPresent(token -> Utils.replyObjectMsg(validation.getSession(), toPaypalToken(token)));
      } else {
        log.error("validation redirect url has error: " + validation);
        Utils.replyObjectMsg(validation.getSession(), new PayPalLoginError());
      }
    } catch (Exception e) {
      log.error("error validate " + validation, e);
      Utils.replyObjectMsg(validation.getSession(), new PayPalLoginError());
    }
  }

  @Subscribe
  @AllowConcurrentEvents
  public void onPaypalLoginURL(final PaypalLoginURL loginURL) {
    // returnUri needs to match the string for the APP config on developer.paypal.com
    // "state" will be passed back to returnURL by PayPal Oauth server
    UriBuilder returnUri = UriBuilder.fromUri(validateURI).queryParam("state", encode());

    URI redirectToPayPalLogin = UriBuilder.fromUri(loginServiceUri)
        .queryParam("nonce", System.currentTimeMillis())
        .queryParam("redirect_uri", returnUri.build())
        .build();

    loginURL.setTopic(PaypalLoginURL.class.getSimpleName());
    loginURL.setLoginURL(redirectToPayPalLogin.toString());
    loginURL.setValidateURL(validateURI.toString());

    Utils.replyObjectMsg(loginURL.getSession(), loginURL);
  }

  private String encode() {
    try {
      return URLEncoder.encode("oid" + "1343", StandardCharsets.UTF_8.name());
    } catch (UnsupportedEncodingException e) {

    }
    return "";
  }

  private PaypalToken toPaypalToken(OAuthToken token) {
    PaypalToken paypalToken = new PaypalToken();
    paypalToken.setAccessToken(token.getAccessToken());
    paypalToken.setRefreshURL("paypal/refresh?token=" + HandlerUtils.encrypt(this.passwd, token.getRefreshToken()));
    paypalToken.setExpires(Env.isProd ? token.getExpires() : EXPIRY_10_SECONDS);

    return paypalToken;
  }
}

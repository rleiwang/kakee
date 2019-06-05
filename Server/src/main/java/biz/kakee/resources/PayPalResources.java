package biz.kakee.resources;

import biz.kakee.pvo.events.request.operator.PaypalRefresh;
import biz.kakee.utils.AbstractEventHandler;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

import javax.annotation.security.PermitAll;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.*;
import javax.ws.rs.container.AsyncResponse;
import javax.ws.rs.container.Suspended;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;

/**
 * https://devtools-paypal.com/guide/openid/curl
 * <p>
 * 1) Kakee App calls /paypal/login, Response 307 redirect to PayPal Oauth Login Page
 * 2) Kakee App login on PayPal, Oauth redirect back to /paypal/validate with code,
 * use code to call paypal token service to get access token and return kakee app
 * 3) Kakee App call refresh URL to get a new access token
 */
@Path("paypal")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@Slf4j
public class PayPalResources {

    class EventHandler extends AbstractEventHandler {
        private void post(final PaypalRefresh event) {
            asyncEventBus.post(event);
        }
    }

    private final EventHandler eventHandler = new EventHandler();

    @Path("refresh")
    @GET
    @PermitAll
    public void refresh(@Context HttpServletRequest request, @Suspended final AsyncResponse response,
                        @QueryParam("token") String token, @QueryParam("operatorId") String operatorId) {
        if (StringUtils.isNotEmpty(token) && StringUtils.isNotEmpty(operatorId)) {
            eventHandler.post(new PaypalRefresh(response, operatorId, getFullURL(request), token));
        } else {
            response.cancel();
        }
    }

    private static String getFullURL(HttpServletRequest request) {
        StringBuffer requestURL = request.getRequestURL();
        String queryString = request.getQueryString();

        if (queryString == null) {
            return requestURL.toString();
        } else {
            return requestURL.append('?').append(queryString).toString();
        }
    }
}

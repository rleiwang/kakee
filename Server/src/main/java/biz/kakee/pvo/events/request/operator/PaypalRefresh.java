package biz.kakee.pvo.events.request.operator;

import lombok.Data;

import javax.ws.rs.container.AsyncResponse;

@Data
public class PaypalRefresh {
    private final AsyncResponse response;
    private final String operatorId;
    private final String requestURL;
    private final String token;
}

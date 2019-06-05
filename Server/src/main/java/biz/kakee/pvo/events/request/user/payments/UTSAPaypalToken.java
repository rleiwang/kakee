package biz.kakee.pvo.events.request.user.payments;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class UTSAPaypalToken extends UTSQPaypalToken {
    private String accessCode;
    private String token;
    private String square;

    public UTSAPaypalToken(UTSQPaypalToken query) {
        setOperatorId(query.getOperatorId());
        setTopic(UTSAPaypalToken.class.getSimpleName());
    }
}

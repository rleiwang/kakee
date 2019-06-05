package biz.kakee.events.response;

import biz.kakee.pvo.events.Identity;
import biz.kakee.pvo.events.Status;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import org.eclipse.jetty.websocket.api.Session;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ServerResponse {
    private Session session;

    private Status status;
    private String msg;
    private long sequence;
    private String topic;
    private Identity src;
    private Identity dest;
}

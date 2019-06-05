package biz.kakee.pvo.events.request.common;

import biz.kakee.pvo.events.Channel;
import lombok.Data;

import javax.websocket.Session;

@Data
public class MyLogout {
    private final Channel channel;
    private final Session session;
    private final String id;
    private final String remote;
}

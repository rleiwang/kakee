package biz.kakee.websockets;

import biz.kakee.pvo.events.Channel;
import biz.kakee.pvo.events.request.user.SearchingFoodTrucks;
import lombok.extern.slf4j.Slf4j;

import javax.websocket.server.ServerEndpoint;

@Slf4j
@ServerEndpoint(value = "/users",
        encoders = {Encoder.class}, decoders = {UserEndPoint.Decoder.class})
public class UserEndPoint extends AbstractWebSocket {
    public static class Decoder extends biz.kakee.websockets.Decoder {
        public Decoder() {
            super(SearchingFoodTrucks.class);
        }
    }

    public UserEndPoint() {
        super(Channel.user);
    }
}

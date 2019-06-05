package biz.kakee.websockets;


import biz.kakee.pvo.events.Channel;
import biz.kakee.pvo.events.request.operator.Open;
import lombok.extern.slf4j.Slf4j;

import javax.websocket.server.ServerEndpoint;

@Slf4j
@ServerEndpoint(value = "/operators",
        encoders = {Encoder.class}, decoders = {OperatorEndPoint.Decoder.class})
public class OperatorEndPoint extends AbstractWebSocket {
    public static class Decoder extends biz.kakee.websockets.Decoder {
        public Decoder() {
            super(Open.class);
        }
    }

    public OperatorEndPoint() {
        super(Channel.operator);
    }
}

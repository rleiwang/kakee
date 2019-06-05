package biz.kakee.websockets;

import biz.kakee.events.ClientMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.WebSocketListener;
import org.eclipse.jetty.websocket.client.WebSocketClient;

import java.io.Closeable;
import java.net.URI;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.function.BiConsumer;

@Slf4j
public class WSTestClient implements Closeable, WebSocketListener {
    private final WebSocketClient wsClient = new WebSocketClient();
    private final BiConsumer<Session, String> msgConsumer;
    private final CountDownLatch latch = new CountDownLatch(1);

    private Session session;

    public WSTestClient(URI uri, BiConsumer<Session, String> msgConsumer) throws Exception {
        this.msgConsumer = msgConsumer;
        wsClient.start();
        wsClient.connect(this, uri);
        latch.await();
    }

    @Override
    public void onWebSocketBinary(byte[] payload, int offset, int len) {

    }

    @Override
    public void onWebSocketClose(int statusCode, String reason) {
        log.info("client disconnected");
        this.session = null;
    }

    @Override
    public void onWebSocketConnect(Session session) {
        log.info("client connected");
        this.session = session;
        latch.countDown();
    }

    @Override
    public void onWebSocketError(Throwable cause) {
        log.info("client error", cause);
    }

    @Override
    public void onWebSocketText(String msg) {
        log.info("received " + msg);
        msgConsumer.accept(this.session, msg);
    }

    public void publish(ClientMessage msg) {
        Optional.ofNullable(session)
                .filter(s -> s.isOpen())
                .map(s -> {
                    try {
                        s.getRemote().sendString(new ObjectMapper().writeValueAsString(msg));
                    } catch (Exception e) {
                        log.error("failed to send", e);
                    }
                    return Optional.empty();
                })
                .orElseGet(() -> {
                    log.info("session is not open");
                    return Optional.empty();
                });
    }

    @Override
    public void close() {
        try {
            wsClient.stop();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

package biz.kakee.websockets;

import biz.kakee.Conf;
import biz.kakee.Main;
import biz.kakee.resources.OperatorResources;
import io.dropwizard.testing.junit.DropwizardAppRule;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.WebSocketListener;
import org.eclipse.jetty.websocket.client.ClientUpgradeRequest;
import org.eclipse.jetty.websocket.client.WebSocketClient;
import org.junit.ClassRule;

import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.stream.Stream;

public class WebSocketTest {
    public static class TestClient extends WebSocketClient implements AutoCloseable {
        public TestClient() {
            try {
                start();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }

        @Override
        public void close() throws Exception {
            stop();
        }
    }

    // same as gradle $buildDir
    protected static Path BuildDir = Paths.get(OperatorResources.class.getProtectionDomain()
            .getCodeSource().getLocation().getPath()).getParent().getParent();

    @ClassRule
    public static final DropwizardAppRule<Conf> RULE =
            new DropwizardAppRule<>(Main.class, BuildDir.resolve("resources/main/config.yml").toString());

    protected URI wsURI;

    protected WebSocketClient newTestClient() {
        return new TestClient();
    }

    protected static int TIMEOUT = 50;
    protected static TimeUnit TOUnit = TimeUnit.DAYS;

    protected CompletableFuture<String> sendAsyncReq(Consumer<Session> onConnect,
                                                     BiConsumer<Integer, String>... onClose) throws Exception {
        CompletableFuture<String> future = new CompletableFuture<>();
        newTestClient().connect(new WebSocketListener() {
            @Override
            public void onWebSocketBinary(byte[] payload, int offset, int len) {
                throw new IllegalStateException("websocket binary is not supported");
            }

            @Override
            public void onWebSocketClose(int statusCode, String reason) {
                if (onClose.length > 0) {
                    Stream.of(onClose).map(f -> {
                        f.accept(statusCode, reason);
                        return null;
                    });
                } else {
                    printCloseReasoning(statusCode, reason);
                }
            }

            @Override
            public void onWebSocketConnect(Session session) {
                onConnect.accept(session);
            }

            @Override
            public void onWebSocketError(Throwable cause) {
                future.completeExceptionally(cause);
            }

            @Override
            public void onWebSocketText(String message) {
                future.complete(message);
            }
        }, wsURI, new ClientUpgradeRequest());
        return future;
    }

    protected void printCloseReasoning(int status, String reason) {
        System.out.println("closed " + status + ", reason:" + reason);
    }
}

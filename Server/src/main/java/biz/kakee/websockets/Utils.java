package biz.kakee.websockets;

import biz.kakee.pvo.events.WebSocketMessage;
import lombok.extern.slf4j.Slf4j;

import javax.websocket.SendResult;
import javax.websocket.Session;
import java.util.concurrent.CompletableFuture;

@Slf4j
public class Utils {
    public static CompletableFuture<SendResult> sendTo(Session session, Object msg) {
        CompletableFuture<SendResult> future = new CompletableFuture<>();
        session.getAsyncRemote().sendObject(msg, (result) -> {
            log.info(result.isOK() + " to socket send " + msg);
            future.complete(result);
        });
        return future;
    }

    public static void replyOk(WebSocketMessage msg) {
        replyObjectMsg(msg.getSession(), msg.getSequence() + 1);
    }

    public static void replyObjectMsg(Session session, Object msg) {
        session.getAsyncRemote().sendObject(msg, (result) -> {
            if (result.isOK()) {
                log.info(result.isOK() + " to socket send " + msg);
            } else {
                // we need to deal with offline
                log.error("err to socket send " + msg, result.getException());
            }
        });
    }

    public static CompletableFuture<Void> replyTextMsg(Session session, String msg) {
        final CompletableFuture<Void> future = new CompletableFuture<>();
        session.getAsyncRemote().sendText(msg, (result) -> {
            if (result.isOK()) {
                future.complete(null);
            } else {
                future.completeExceptionally(new Exception("send failure"));
            }
        });
        return future;
    }
}

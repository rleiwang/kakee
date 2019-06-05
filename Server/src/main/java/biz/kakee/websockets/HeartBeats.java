package biz.kakee.websockets;

import javax.websocket.Session;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public final class HeartBeats {

    public static final HeartBeats DEFAULT = new HeartBeats();

    private final ConcurrentMap<String, Session> connected = new ConcurrentHashMap<>();
    private final ScheduledExecutorService ses = Executors.newSingleThreadScheduledExecutor();

    public void onConnected(Session session) {
        connected.put(session.getId(), session);
    }

    public void onDisconnected(Session session) {
        connected.remove(session.getId());
    }

    private HeartBeats() {
        ses.scheduleAtFixedRate(() ->
                connected.entrySet().parallelStream().forEach(entry ->
                        entry.getValue().getAsyncRemote().sendText("", handler -> {
                            if (!handler.isOK()) {
                                try {
                                    entry.getValue().close();
                                } catch (Exception e) {
                                }
                            }
                        })
                ), 0, 15, TimeUnit.SECONDS);
    }
}

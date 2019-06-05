package biz.kakee.websockets;

import biz.kakee.events.ClientMenu;
import biz.kakee.pvo.geo.GeoLocation;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.WebSocketListener;
import org.eclipse.jetty.websocket.client.ClientUpgradeRequest;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.io.IOException;
import java.net.URI;
import java.util.concurrent.CountDownLatch;

public class OperatorSocketTest extends WebSocketTest {
    @Before
    public void setUp() throws Exception {
        wsURI = URI.create(String.format("ws://localhost:%d/operators", RULE.getLocalPort()));
    }

    @After
    public void tearDown() throws Exception {

    }

    @Test
    public void testAnnouncement() throws Exception {
        final CountDownLatch latch = new CountDownLatch(1);
        newTestClient().connect(new WebSocketListener() {
            @Override
            public void onWebSocketBinary(byte[] payload, int offset, int len) {
                System.out.println("binary");
            }

            @Override
            public void onWebSocketClose(int statusCode, String reason) {
                System.out.println("closed");
            }

            @Override
            public void onWebSocketConnect(Session session) {
                /*
                try {

                    Message<Channel, Channel.Topic> msg = new Message<>();
                    msg.setToken("dummy");
                    msg.setChannel(Channel.operator);
                    msg.setTopic(Channel.Topic.Announcement);
                    msg.setData("{}");
                    session.getRemote().sendString(new ObjectMapper().writeValueAsString(msg));
                } catch (IOException e) {
                    e.printStackTrace();
                }
                */
            }

            @Override
            public void onWebSocketError(Throwable cause) {
                System.out.println("error");
            }

            @Override
            public void onWebSocketText(String message) {
                System.out.println("message " + message);
                latch.countDown();
            }
        }, wsURI, new ClientUpgradeRequest());
        while (latch.getCount() > 0) {
            latch.await();
        }
    }

    @Test
    public void testMenuPublish() throws Exception {
        sendAsyncReq(session -> {
            try {
                ClientMenu menu = new ClientMenu();
                menu.setToken("dummy token");
                menu.setGeoLocation(fakeLocation());
                menu.setMenu("this is dummy menu");
                session.getRemote().sendString(new ObjectMapper().writeValueAsString(menu));
            } catch (IOException e) {
                e.printStackTrace();
            }
        }).whenComplete((msg, exp) -> {
            System.out.println(msg);
        }).get(TIMEOUT, TOUnit);

    }

    private GeoLocation fakeLocation() {
        GeoLocation location = new GeoLocation();
        location.setLatitude(37.784732f);
        location.setLongitude(-122.427891f);
        return location;
    }
}

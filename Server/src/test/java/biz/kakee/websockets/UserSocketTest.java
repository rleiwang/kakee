package biz.kakee.websockets;

import biz.kakee.events.ClientOrder;
import biz.kakee.events.ClientSearchFoodStruck;
import biz.kakee.events.Connected;
import biz.kakee.events.NoSeqNoEvent;
import biz.kakee.events.Utils;
import biz.kakee.pvo.events.Status;
import biz.kakee.pvo.geo.GeoLocation;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.jetty.websocket.api.Session;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.*;

public class UserSocketTest extends WebSocketTest {

    @Before
    public void setUp() throws Exception {
        wsURI = URI.create(String.format("ws://localhost:%d/users", RULE.getLocalPort()));
    }

    @After
    public void tearDown() throws Exception {
    }

    @Test
    public void testSearchingFoodTrucks() throws Exception {
        sendAsyncReq(session -> {
            try {
                ClientSearchFoodStruck searchFoodStruck = new ClientSearchFoodStruck();
                searchFoodStruck.setSequence(10);
                searchFoodStruck.setGeoLocation(fakeLocation());
                searchFoodStruck.setToken("dummy");
                session.getRemote().sendString(new ObjectMapper().writeValueAsString(searchFoodStruck));
            } catch (IOException e) {
                e.printStackTrace();
            }
        }).whenComplete((msg, exp) -> {
            assertNull("exception from server", exp);
            System.out.println(msg);
        }).get(TIMEOUT, TOUnit);
    }

    @Test
    public void testOrder() throws Exception {
        sendAsyncReq(session -> {
            try {
                ClientOrder order = new ClientOrder();
                order.setSequence(10);
                order.setRefCode("orderNod");
                order.setGeoLocation(fakeLocation());
                order.setToken("dummy");
                session.getRemote().sendString(new ObjectMapper().writeValueAsString(order));
            } catch (IOException e) {
                e.printStackTrace();
            }

        }).whenComplete((msg, exp) -> {
            System.out.println();
        }).get(TIMEOUT, TOUnit);
    }

    @Test
    public void testConnected() throws Exception {
        sendAsyncReq(session -> reply(session, myLocation()))
                .whenComplete((msg, exp) -> {
                    assertNull("exception from server", exp);
                    //assertEquals("server error code", Status.Ok, Status.valueOf(errors.get("status")));
                }).get(TIMEOUT, TOUnit);
    }

    @Test
    public void testErrConnection() throws Exception {
        sendAsyncReq(session -> reply(session, missingSeqNo()))
                .whenComplete((msg, exp) -> {
                    assertNull("exception from server", exp);
                    Map<String, String> errors = new HashMap<>();
                    try {
                        assertNotNull("expecting error from server", (errors = new ObjectMapper().readValue(msg, errors.getClass())));
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                    assertEquals("server error code", Status.InvalidRequest, Status.valueOf(errors.get("status")));
                    assertEquals("server error msg", "seqno", errors.get("message"));
                }).get();
    }

    private void reply(Session session, String payload) {
        /*
        Message<Channel, Channel.Topic> msg = new Message<>();
        msg.setToken("dummy");
        msg.setChannel(Channel.user);
        msg.setTopic(Channel.Topic.MyLocation);
        msg.setData(payload);
        try {
            session.getRemote().sendString(new ObjectMapper().writeValueAsString(msg));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        */
    }

    private String myLocation() {
        try {
            return new ObjectMapper().writeValueAsString(Connected.builder()
                    .location(fakeLocation()).seqNo(Utils.nextSeqNo()).build());
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }

    private String missingSeqNo() {
        try {
            return new ObjectMapper().writeValueAsString(NoSeqNoEvent.builder().location(fakeLocation()).build());
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }

    private GeoLocation fakeLocation() {
        GeoLocation location = new GeoLocation();
        location.setLatitude(37.784732f);
        location.setLongitude(-122.427891f);
        return location;
    }
}
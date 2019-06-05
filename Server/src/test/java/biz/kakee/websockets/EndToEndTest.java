package biz.kakee.websockets;

import biz.kakee.Conf;
import biz.kakee.Main;
import biz.kakee.events.ClientLogin;
import biz.kakee.events.ClientMenu;
import biz.kakee.events.ClientOrder;
import biz.kakee.events.ClientOrderStatus;
import biz.kakee.events.response.ServerResponse;
import biz.kakee.pvo.events.Channel;
import biz.kakee.pvo.events.Identity;
import biz.kakee.pvo.events.request.operator.OrderStatus;
import biz.kakee.pvo.events.request.user.MobileOrder;
import biz.kakee.pvo.geo.GeoLocation;
import biz.kakee.resources.OperatorResources;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dropwizard.testing.junit.DropwizardAppRule;
import org.junit.Assert;
import org.junit.ClassRule;
import org.junit.Test;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.BiConsumer;

public class EndToEndTest {
    // same as gradle $buildDir
    protected static Path BuildDir = Paths.get(OperatorResources.class.getProtectionDomain()
            .getCodeSource().getLocation().getPath()).getParent().getParent();

    @ClassRule
    public static final DropwizardAppRule<Conf> RULE =
            new DropwizardAppRule<>(Main.class, BuildDir.resolve("resources/main/config.yml").toString());

    @Test
    public void testOrder() throws Exception {
        final BiConsumer<ServerResponse, CountDownLatch> defaultHandler =
                (response, latch) -> System.out.println("no handler ope res " + response);
        WSTestClient[] operator = new WSTestClient[1];

        final Map<String, BiConsumer<ServerResponse, CountDownLatch>> operatorExpectedMsg = new HashMap<>();
        operatorExpectedMsg.put(MobileOrder.class.getSimpleName(),
                (response, latch) -> {
                    System.out.println("operator got expected " + response);
                    operator[0].publish(createClientOrderReceipt(response));
                    latch.countDown();
                });

        final Map<String, BiConsumer<ServerResponse, CountDownLatch>> userExpectedMsg = new HashMap<>();
        userExpectedMsg.put(OrderStatus.class.getSimpleName(),
                (response, latch) -> {
                    System.out.println("user got expected " + response);
                    latch.countDown();
                });

        final CountDownLatch latch = new CountDownLatch(operatorExpectedMsg.size() + userExpectedMsg.size());
        String operatorId = "opera1";
        URI operatorEndPoint = URI.create(String.format("ws://localhost:%d/operators", RULE.getLocalPort()));
        String userId = "user1";
        operator[0] = new WSTestClient(operatorEndPoint,
                (session, msg) -> {
                    try {
                        ServerResponse response = new ObjectMapper().readValue(msg, ServerResponse.class);
                        response.setSession(session);
                        operatorExpectedMsg.getOrDefault(response.getTopic(), defaultHandler).accept(response, latch);
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                });

        operator[0].publish(createClientLogin(operatorId));
        operator[0].publish(createClientMenu());

        URI userEndPoint = URI.create(String.format("ws://localhost:%d/users", RULE.getLocalPort()));
        WSTestClient user = new WSTestClient(userEndPoint, (session, msg) -> {
            try {
                ServerResponse response = new ObjectMapper().readValue(msg, ServerResponse.class);
                response.setSession(session);
                userExpectedMsg.getOrDefault(response.getTopic(), defaultHandler).accept(response, latch);
            } catch (IOException e) {
                e.printStackTrace();
            }
        });
        user.publish(createClientLogin(userId));
        user.publish(createClientOrder(operatorId));

        Assert.assertTrue("time out", latch.await(20, TimeUnit.SECONDS));
    }

    private ClientLogin createClientLogin(String token) {
        ClientLogin login = new ClientLogin();
        login.setSequence(0);
        login.setGeoLocation(fakeLocation());
        login.setToken(token);

        return login;
    }

    private ClientOrder createClientOrder(String opId) {
        ClientOrder order = new ClientOrder();
        order.setRefCode("adfdf");
        order.setDest(new Identity(opId, Channel.operator));
        order.setGeoLocation(fakeLocation());
        order.setSequence(2);
        return order;
    }

    private GeoLocation fakeLocation() {
        GeoLocation location = new GeoLocation();
        location.setLatitude(37.784732f);
        location.setLongitude(-122.427891f);
        return location;
    }

    private ClientOrderStatus createClientOrderReceipt(ServerResponse response) {
        ClientOrderStatus receipt = new ClientOrderStatus();
        receipt.setDest(response.getSrc());
        receipt.setGeoLocation(fakeLocation());
        receipt.setSequence(response.getSequence() + 1);
        receipt.setToken("dfjdfkdj");
        return receipt;
    }

    private ClientMenu createClientMenu() {
        ClientMenu menu = new ClientMenu();
        menu.setToken("dummy token");
        menu.setSequence(20);
        menu.setGeoLocation(fakeLocation());
        menu.setMenu("this is dummy menu");
        return menu;
    }

}

package biz.kakee;

import com.fasterxml.jackson.annotation.JacksonInject;
import com.fasterxml.jackson.annotation.JsonCreator;
import lombok.Data;
import lombok.EqualsAndHashCode;

import javax.validation.constraints.Null;
import java.io.Serializable;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;

//import uk.co.real_logic.agrona.concurrent.UnsafeBuffer;
//import uk.co.real_logic.agrona.io.MutableDirectBufferOutputStream;

public class Test {
    @Data
    public static class EE {
        private final int abc;
    }

    @Data
    @EqualsAndHashCode(callSuper = true)
    public static class EEE extends EE {
        private String efg;

        @JsonCreator
        public EEE(@JacksonInject("abc") int a) {
            super(a);
        }
    }

    public static class testa implements Serializable {

    }

    public static class MyException extends RuntimeException {

    }

    public static void main(String[] argv) throws Exception {

        CompletableFuture.completedFuture(Optional.empty()
        ).thenCompose(aLong ->
                aLong.isPresent() ? CompletableFuture.completedFuture("abc") :
                        CompletableFuture.supplyAsync(() -> {
                            System.out.println("throw excep");
                            throw new MyException();
                        })
        ).thenCompose(a -> {
                    System.out.println("object " + a);
            return CompletableFuture.completedFuture(1.5D);

                }
            /*
            try {
                System.out.println("object " + a.get());
            } catch (InterruptedException e) {
                e.printStackTrace();
            } catch (ExecutionException e) {
                e.printStackTrace();
            }
            */

        ).whenComplete((o, exp) -> {
            System.out.println("xp is " + exp);
            System.out.println("object is " + o);

                }

        );/*.exceptionally(exp -> {
                    System.out.println("in the middle " + (exp.getCause() instanceof NullPointerException));
            return "bad";
                }
        );*/
        /*
        String name = Collections.list(NetworkInterface.getNetworkInterfaces()).stream()
                .filter(netInterface -> "en0".equals(netInterface.getName()))
                .map(netInterface -> netInterface.getInetAddresses())
                .map(netAddr -> Collections.list(netAddr))
                .flatMap(netAddr -> netAddr.stream())
                .filter(netAddr -> netAddr instanceof Inet4Address)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No interface was found"))
                .getHostAddress();

        System.out.println(name);
        */

        /*

        ObjectMapper mapper = new ObjectMapper();
        mapper.enable(SerializationFeature.WRITE_ENUMS_USING_TO_STRING);
        JsonSchemaGenerator generator = new JsonSchemaGenerator(mapper);
        JsonSchema jsonSchema = generator.generateSchema(Channel.class);

        UnsafeBuffer unsafeBuffer = new UnsafeBuffer(ByteBuffer.allocateDirect(1024));
        MutableDirectBufferOutputStream mdbos = new MutableDirectBufferOutputStream(unsafeBuffer);
        mapper.writeValue(mdbos, jsonSchema);

        System.out.println("length=" + mdbos.offset());

        System.out.println(mapper.writeValueAsString(jsonSchema));
        InjectableValues iv = new InjectableValues.Std().addValue("abc", 10);

        //OrderReceipt userOrder = new OrderReceipt(10);
        //System.out.println(mapper.writeValueAsString(userOrder));


        EEE eee = new ObjectMapper().reader(EEE.class).with(iv).readValue("{ \"efg\": \"dkdkd\"}");

        System.out.println(new ObjectMapper().writeValueAsString(eee));

        ApiKey apiKey = new ApiKey();
        apiKey.setClientId("clientId");
        apiKey.setSecret("secret");
        System.out.println(new ObjectMapper().writeValueAsString(apiKey));

        Integer b = 10;

        WebSocketMessage msg = new WebSocketMessage() {
            public String getTopic() {
                return "Test";
            }
        };
        msg.setSequence(1);
        GeoLocation location = new GeoLocation();
        location.setLatitude(-183);
        location.setLongitude(203D);
        msg.setGeoLocation(location);
        //msg.setTopic("Test");

        TestContent testContent = new TestContent();
        testContent.setAbc("dkfjkdfjk");
        msg.setContent(testContent);

        String testSrc = new ObjectMapper().writeValueAsString(msg);

        SubtypeResolver subtypeResolver = new StdSubtypeResolver();

        subtypeResolver.registerSubtypes(new NamedType(testContent.getClass(), "Test"));


        ObjectMapper smapper = new ObjectMapper();
        DeserializationConfig config = smapper.getDeserializationConfig().with(subtypeResolver);


        WebSocketMessage wsMsg = smapper.setConfig(config).readerFor(WebSocketMessage.class).readValue(testSrc);

        System.out.println();
        */

        /*
        Message msg = new Message();
        msg.setChannel(Message.Channel.order);
        msg.setTopic(Topic.SearchingFoodTrucks);
        msg.setData("abc");
        System.out.println(new ObjectMapper().writeValueAsString(msg));

        System.out.println("here");
        Message newMsg = new ObjectMapper().readValue("{\"token\":null,\"channel\":\"order\",\"topic\":\"SearchingFoodTrucks\",\"data\":\"abc\"}",
                Message.class);

        System.out.println(newMsg.getTopic().getEventClz());
        System.out.println("get done");
        */
    }
}

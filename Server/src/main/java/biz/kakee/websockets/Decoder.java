package biz.kakee.websockets;

import biz.kakee.pvo.events.Channel;
import biz.kakee.pvo.events.WebSocketMessage;
import biz.kakee.pvo.events.request.common.MyLogin;
import com.fasterxml.jackson.databind.DeserializationConfig;
import com.fasterxml.jackson.databind.InjectableValues;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import com.fasterxml.jackson.databind.jsontype.NamedType;
import com.fasterxml.jackson.databind.jsontype.SubtypeResolver;
import com.fasterxml.jackson.databind.jsontype.impl.StdSubtypeResolver;
import com.google.common.reflect.ClassPath;

import javax.websocket.DecodeException;
import javax.websocket.EndpointConfig;
import java.io.IOException;

public abstract class Decoder implements javax.websocket.Decoder.Text<WebSocketMessage> {
    private final ObjectReader jsonReader;

    public Decoder(Class clz) {

        SubtypeResolver subtypeResolver = new StdSubtypeResolver();

        addClzToResolver(subtypeResolver, MyLogin.class);
        addClzToResolver(subtypeResolver, clz);


        ObjectMapper mapper = new ObjectMapper();
        DeserializationConfig config = mapper.getDeserializationConfig().with(subtypeResolver);

        this.jsonReader = mapper.setConfig(config).readerFor(WebSocketMessage.class).
                with(new InjectableValues.Std().addValue("channel", Channel.user));
    }

    @Override
    public WebSocketMessage decode(String s) throws DecodeException {
        try {
            return jsonReader.readValue(s);
        } catch (IOException e) {
            throw new DecodeException(s, "", e);
        }
    }

    @Override
    public boolean willDecode(String s) {
        return false;
    }

    @Override
    public void init(EndpointConfig config) {
    }

    @Override
    public void destroy() {
    }

    private void addClzToResolver(SubtypeResolver subtypeResolver, Class clz) {
        try {
            ClassPath clzPath = ClassPath.from(clz.getClassLoader());
            for (ClassPath.ClassInfo clzInfo : clzPath.getTopLevelClassesRecursive(clz.getPackage().getName())) {
                subtypeResolver.registerSubtypes(new NamedType(Class.forName(clzInfo.getName()), clzInfo.getSimpleName()));
            }
        } catch (IOException | ClassNotFoundException e) {
            throw new RuntimeException(e);
        }
    }
}

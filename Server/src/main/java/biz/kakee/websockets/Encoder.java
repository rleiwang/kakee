package biz.kakee.websockets;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.websocket.EncodeException;
import javax.websocket.EndpointConfig;

public class Encoder implements javax.websocket.Encoder.Text<Object> {
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public String encode(Object object) throws EncodeException {
        try {
            return mapper.writeValueAsString(object);
        } catch (JsonProcessingException e) {
            throw new EncodeException(object, "", e);
        }
    }

    @Override
    public void init(EndpointConfig config) {

    }

    @Override
    public void destroy() {

    }
}

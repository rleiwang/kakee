package biz.kakee.pvo.events;

import biz.kakee.pvo.geo.GeoLocation;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import javax.websocket.Session;
import java.time.ZoneOffset;
import java.util.Locale;

@ToString
@EqualsAndHashCode
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "topic")
public abstract class WebSocketMessage {
    @Getter
    @Setter
    @JsonIgnore
    private Session session;

    @Getter
    @Setter
    @JsonIgnore
    private String remote;

    @Getter
    @Setter
    protected Identity src;

    @Getter
    @Setter
    protected ZoneOffset tzOffset;

    @Getter
    @Setter
    protected Locale locale;

    @Getter
    protected Identity dest;

    @Getter
    @Setter
    private String topic;

    @Getter
    private long sequence;

    @Getter
    private String installID;

    @Getter
    private GeoLocation geoLocation;

    public void merge(WebSocketMessage another) {
        this.src = another.getSrc();
        this.dest = another.getDest();
        this.geoLocation = another.getGeoLocation();
    }
}
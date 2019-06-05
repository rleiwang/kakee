package biz.kakee.websockets;

import biz.kakee.aeron.EmbeddedAeron;
import biz.kakee.aeron.ipc.AeronIPC;
import biz.kakee.pvo.Env;
import biz.kakee.pvo.events.Authorized;
import biz.kakee.pvo.events.*;
import biz.kakee.pvo.events.request.common.*;
import biz.kakee.pvo.events.request.operator.ReConnected;
import biz.kakee.pvo.events.request.operator.ResetPasscode;
import biz.kakee.pvo.events.response.operator.Authorization;
import biz.kakee.utils.AbstractEventHandler;
import com.codahale.metrics.Counter;
import com.codahale.metrics.Timer;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jetty.websocket.common.WebSocketSession;

import javax.websocket.*;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import java.util.function.Consumer;

@Slf4j
public abstract class AbstractWebSocket extends AbstractEventHandler {
    //protected final Subscription subscription;
    protected final Channel channel;

    private Counter connCounter;
    private Counter errCounter;
    private Timer msgMeter;

    private ConnectionState state = ConnectionState.initial;
    private String deviceId;
    private String id;
    private Locale locale;
    private ZoneOffset tzOffset;
    private Session session;
    private String remoteHost;

    public AbstractWebSocket(Channel channel) {
        this.channel = channel;
        connCounter = MetricRegistra.getMetricRegistry().counter(channel.name() + ".conns");
        errCounter = MetricRegistra.getMetricRegistry().counter(channel.name() + ".errs");
        msgMeter = MetricRegistra.getMetricRegistry().timer(channel.name() + ".msgs");
    }

    @OnOpen
    public final void onOpen(final Session session, final EndpointConfig conf) {
        connCounter.inc();
        WebSocketSession webSocketSession = (WebSocketSession) session;
        this.session = session;
        remoteHost = webSocketSession.getRemoteAddress().getHostString();
        log.info("open session {} from {}", session.getId(), remoteHost);
    }

    @OnClose
    public final void onClose(Session session, CloseReason reason) {
        connCounter.dec();
        if (reason.getCloseCode().getCode() == CloseReason.CloseCodes.CANNOT_ACCEPT.getCode()) {
            // unauthorized
            return;
        }
        log.info("close session {}, {}", session.getId(), reason);
        synchronized (this) {
            if (id != null) {
                HeartBeats.DEFAULT.onDisconnected(session);
                log.info("{} logout from {} on channel {}", id, session.getId(), channel);
                EmbeddedAeron.unSubscribeUniCast(id);
                asyncEventBus.post(new MyLogout(channel, session, id, remoteHost));
                id = null;
                this.session = null;
            }
        }
    }

    @OnError
    public final void onError(Session session, Throwable error) {
        errCounter.inc();
        log.error(session.getId(), error);
    }

    @OnMessage
    public final void onMessage(Session session, WebSocketMessage msg) {
        try (Timer.Context mctx = msgMeter.time();
             Timer.Context iCtx = MetricRegistra.getMetricRegistry()
                 .timer(channel.name() + ".msgs." + msg.getClass().getSimpleName())
                 .time()) {
            // detect if we need to reject this incoming request
            msg.setRemote(remoteHost);
            msg.setSession(session);
            switch (state) {
                case initial:
                    connect(msg);
                    break;
                case verified:
                    authenticate(msg);
                    break;
                case authorized:
                    authorize(msg);
                    break;
            }
            log.info("received " + msg);
        }
    }

    // validate client certificate
    private void connect(WebSocketMessage msg) {
        if (msg instanceof MyLogin) {
            MyLogin myLogin = (MyLogin) msg;
            Optional<String> verfied = WebSocketAuthenticator.verify(Base64.getMimeDecoder().decode(myLogin.getToken()));
            if (verfied.isPresent()) {
                DeviceInfo deviceInfo = myLogin.getDeviceInfo();
                if (verfied.get().equals(deviceInfo.getUniqueID())) {
                    deviceId = deviceInfo.getUniqueID();
                    // Javascript getTimezoneOffset() method returns the time difference
                    // between UTC time and local time, in minutes, GMT +2, -120 will return
                    tzOffset = ZoneOffset.ofHours(-1 * deviceInfo.getTzOffsetHours());
                    locale = Locale.forLanguageTag(deviceInfo.getLocale());
                    asyncEventBus.post(deviceInfo);
                    state = ConnectionState.verified;
                    Utils.replyObjectMsg(session, new Connected());
                } else {
                    log.info("device id are not the same " + verfied.get() + ", " + deviceInfo.getUniqueID());
                }
            }
        }
    }

    // authenticate user password or auth token if re-connect
    private void authenticate(WebSocketMessage msg) {
        setChannelInfo(msg);
        if (msg instanceof biz.kakee.pvo.events.request.common.Authorization) {
            authorize((biz.kakee.pvo.events.request.common.Authorization) msg);
            return;
        } else if (msg instanceof SignUp) {
            SignUp signUpMsg = (SignUp) msg;
            signUpMsg.setOnAuthorized(onAuthorized(signUpMsg.getOperatorId(), signUpMsg));
            asyncEventBus.post(signUpMsg);
            return;
        }
        switch (channel) {
            case user:
                if (msg instanceof biz.kakee.pvo.events.request.user.Authentication) {
                    authenticateUser((biz.kakee.pvo.events.request.user.Authentication) msg);
                }
                break;
            case operator:
                if (msg instanceof biz.kakee.pvo.events.request.operator.Authentication) {
                    authenticateOperator((biz.kakee.pvo.events.request.operator.Authentication) msg);
                } else if (msg instanceof ResetPasscode) {
                    ResetPasscode reset = (ResetPasscode) msg;
                    reset.setOnAuthorized(onAuthorized(reset.getOperatorId(), reset));
                    asyncEventBus.post(reset);
                } else if (msg instanceof NoAuth) {
                    asyncEventBus.post(msg);
                }
                break;
        }
    }

    private void authorize(biz.kakee.pvo.events.request.common.Authorization authorization) {
        Optional<String> uniqueId = WebSocketAuthenticator
            .verify(Base64.getMimeDecoder().decode(authorization.getToken()));
        if (uniqueId.isPresent()) {
            if (channel == Channel.operator) {
                asyncEventBus.post(new ReConnected(uniqueId.get(), authorization, onAuthorized(uniqueId.get(), authorization)));
            } else {
                onAuthorized(uniqueId.get(), authorization).accept(true);
            }
        }
    }

    private void authorize(WebSocketMessage msg) {
        msg.setSrc(new Identity(id, channel));
        msg.setTopic(msg.getClass().getSimpleName());
        setChannelInfo(msg);
        asyncEventBus.post(msg);
        log.info(channel + " posted " + msg);
    }

    private void authenticateUser(biz.kakee.pvo.events.request.user.Authentication msg) {
        msg.setOnAuthorize(onAuthorized(msg.getUserId(), msg));
        asyncEventBus.post(msg);
    }

    private void authenticateOperator(biz.kakee.pvo.events.request.operator.Authentication msg) {
        msg.setOnAuthorize(onAuthorized(msg.getOperatorId(), msg));
        asyncEventBus.post(msg);
    }

    private Consumer<Boolean> onAuthorized(String uniqId, WebSocketMessage msg) {
        return authorized -> {
            String token = null;
            if (authorized) {
                synchronized (this) {
                    if (session != null) {
                        id = uniqId;
                        token = WebSocketAuthenticator.encrypt(id);
                        EmbeddedAeron.subscribeUniCast(id, onAeronIPC(session));
                        log.info("{} login to {} on channel {}", msg, session.getId(), channel);
                        HeartBeats.DEFAULT.onConnected(session);
                        asyncEventBus.post(Authorized.builder()
                            .geoLocation(msg.getGeoLocation())
                            .src(new Identity(id, channel))
                            .deviceId(deviceId)
                            .remote(remoteHost)
                            .session(session)
                            .build());
                        state = ConnectionState.authorized;
                    }
                }
            }

            Utils.replyObjectMsg(session, new Authorization(Env.isProd, token));
        };
    }

    private Consumer<AeronIPC> onAeronIPC(Session session) {
        return (AeronIPC ipc) -> session.getAsyncRemote().sendObject(ipc.getPayload(), onSent(ipc));
    }

    private SendHandler onSent(AeronIPC ipc) {
        return (result) -> {
            if (result.isOK()) {
                EmbeddedAeron.onSuccess(ipc);
            } else if (!result.isOK()) {
                log.error("websocket send err", result.getException());
                EmbeddedAeron.onFailed("websocket error", ipc);
            }
        };
    }

    private void setChannelInfo(WebSocketMessage msg) {
        msg.setTzOffset(tzOffset);
        msg.setLocale(locale);
    }
}

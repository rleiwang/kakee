package biz.kakee.aeron;

import biz.kakee.Conf;
import biz.kakee.aeron.ipc.AeronIPC;
import biz.kakee.pvo.events.WebSocketMessage;
import biz.kakee.pvo.events.request.common.Chat;
import biz.kakee.pvo.events.request.common.OfflineMessage;
import biz.kakee.utils.AbstractEventHandler;
import biz.kakee.utils.OS;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableMap;
import io.aeron.Aeron;
import io.aeron.FragmentAssembler;
import io.aeron.Publication;
import io.aeron.Subscription;
import io.aeron.driver.MediaDriver;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.agrona.CloseHelper;
import org.agrona.MutableDirectBuffer;
import org.agrona.concurrent.BackoffIdleStrategy;
import org.agrona.concurrent.IdleStrategy;
import org.agrona.concurrent.UnsafeBuffer;
import org.agrona.io.DirectBufferInputStream;
import org.agrona.io.DirectBufferOutputStream;

import java.io.IOException;
import java.net.Inet4Address;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.nio.ByteBuffer;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.*;
import java.util.function.Consumer;

@Slf4j
public class EmbeddedAeron extends AbstractEventHandler {
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  private final MediaDriver.Context mdCtx;
  private final MediaDriver mediaDriver;
  private final Aeron aeron;
  private final String IP;

  @Getter
  private final String UNICAST_CHANNEL;

  private final ConcurrentMap<String, Consumer<AeronIPC>> multicastHandlers = new ConcurrentHashMap<>();

  //private static final ConcurrentMap<String, List<Consumer<AeronIPC>>> unicastHandlers =
  //new ConcurrentHashMap<>();
  private final ConcurrentMap<String, Consumer<AeronIPC>> unicastHandlers = new ConcurrentHashMap<>();

  private final ConcurrentMap<String, Publication> publications = new ConcurrentHashMap<>();

  private final ImmutableMap<Subscription, FragmentAssembler> subscriptionMap;

  private final ExecutorService es = Executors.newFixedThreadPool(2);

  private static volatile EmbeddedAeron embeddedAeron;

  public static CompletableFuture<Long> sendUniCast(final String channel, int streamId, final WebSocketMessage msg,
                                                    final AeronIPC.OffLine offLine, final boolean ackSent) {
    return embeddedAeron.publish(channel, streamId, msg, offLine, ackSent);
  }

  public static void subscribeUniCast(String key, Consumer<AeronIPC> val) {
    embeddedAeron.unicastHandlers.put(key, val);
  }

  public static void unSubscribeUniCast(String key) {
    embeddedAeron.unicastHandlers.remove(key);
  }

  public static void start(Conf.AeronConf conf) {
    if (embeddedAeron == null) {
      synchronized (EmbeddedAeron.class) {
        if (embeddedAeron == null) {
          log.info("starting embedded Aeron");
          embeddedAeron = new EmbeddedAeron(conf.getNetIF(), conf.getDataDir());
        }
      }
    }
  }

  public static void close() {
    CloseHelper.close(embeddedAeron.aeron);
    CloseHelper.close(embeddedAeron.mediaDriver);
  }

  public static void onSuccess(AeronIPC ipc) {
    if (ipc.isAckSent()) {
      // TODO: find a better solution
      if (((Map) ipc.getPayload()).get("topic").equals(Chat.class.getSimpleName())) {
        try {
          ObjectMapper mapper = new ObjectMapper();
          String json = mapper.writeValueAsString(ipc.getPayload());
          asyncEventBus.post(mapper.readValue(json, Chat.class));
        } catch (IOException e) {
          log.error("parsing error" + ipc, e);
        }
      }
    }
  }

  public static void onFailed(String errMsg, AeronIPC ipc) {
    AeronIPC.OffLine offLine = ipc.getOffLine();
    if (offLine != null) {
      log.warn(errMsg + " save to offline " + ipc);
      asyncEventBus.post(new OfflineMessage(ipc.getTarget().getId(), offLine.getTopic(),
          offLine.getExpiry(), ipc.getPayload()));
    }
  }

  public static String UNICAST_CHANNEL() {
    return embeddedAeron.getUNICAST_CHANNEL();
  }

  private CompletableFuture<Long>
  publish(String channel, int streamId, WebSocketMessage msg, AeronIPC.OffLine offLine, boolean ackSent) {
    final CompletableFuture<Long> future = new CompletableFuture<>();
    Publication publication = getPublication(channel, streamId);

    try {
      MutableDirectBuffer unsafeBuffer = new UnsafeBuffer(ByteBuffer.allocateDirect(4096));
      DirectBufferOutputStream dbos = new DirectBufferOutputStream(unsafeBuffer);

      new ObjectMapper().writeValue(dbos, new AeronIPC(msg.getDest(), msg, offLine, ackSent));

      long pos = publication.offer(unsafeBuffer, 0, dbos.position());
      if (pos < 0) {
        AeronException.Code err = AeronException.Code.Unknown;
        if (Publication.NOT_CONNECTED == pos) {
          err = AeronException.Code.NoSub;
        } else if (Publication.BACK_PRESSURED == pos) {
          err = AeronException.Code.Busy;
        } else if (Publication.ADMIN_ACTION == pos) {
          err = AeronException.Code.Admin;
        } else if (Publication.CLOSED == pos) {
          err = AeronException.Code.Closed;
        }
        future.completeExceptionally(new AeronException(err));
      } else {
        log.info("aeron published " + msg);
        future.complete(pos);
      }
    } catch (Exception e) {
      future.completeExceptionally(e);
    }
    return future;
  }

  private void onMultiCast(final AeronIPC ipc) {
    multicastHandlers.forEach((k, v) -> {
      try {
        v.accept(ipc);
      } catch (Exception e) {
        log.error("error multicast processing " + k, e);
      }
    });
  }

  private void onUniCast(final AeronIPC ipc) {
    unicastHandlers.getOrDefault(ipc.getTarget().getId(),
        aeronIPC -> onFailed(String.format("%s is not found ", ipc.getTarget().getId()), aeronIPC))
        .accept(ipc);
  }

  private static String getLocalIP(String netIF) {
    try {
      return Collections.list(NetworkInterface.getNetworkInterfaces()).stream()
          .filter(netInterface -> netIF.equals(netInterface.getName()))
          .map(netInterface -> netInterface.getInetAddresses())
          .map(netAddr -> Collections.list(netAddr))
          .flatMap(netAddr -> netAddr.stream())
          .filter(netAddr -> netAddr instanceof Inet4Address)
          .findFirst()
          .orElseThrow(() -> new RuntimeException("No interface was found"))
          .getHostAddress();
    } catch (SocketException e) {
      log.error("unable to get local address", e);
    }

    throw new RuntimeException("failed to get local address");
  }

  private Publication getPublication(String channel, int streamId) {
    //Todo change with streamId
    Publication publication = publications.get(channel);
    if (publication == null) {
      Publication newPub = aeron.addPublication(channel, streamId);
      publication = publications.putIfAbsent(channel, newPub);
      if (null == publication) {
        publication = newPub;
        while (!publication.isConnected()) {
          try {
            Thread.sleep(100);
          } catch (InterruptedException e) {
          }
        }
      }
    }

    return publication;
  }

  private EmbeddedAeron(String netIF, String dir) {
    this.mdCtx = new MediaDriver.Context().aeronDirectoryName(dir);
    this.mediaDriver = MediaDriver.launchEmbedded(mdCtx);
    this.aeron = Aeron.connect(new Aeron.Context().aeronDirectoryName(mdCtx.aeronDirectoryName()));
    this.IP = getLocalIP(netIF);
    this.UNICAST_CHANNEL = "aeron:udp?endpoint=" + IP + ":16888";

    subscriptionMap = new ImmutableMap.Builder<Subscription, FragmentAssembler>()
        .put(aeron.addSubscription(UNICAST_CHANNEL, OS.PID), new FragmentAssembler(
            (buffer, offset, length, header) -> {
              try {
                onUniCast(OBJECT_MAPPER.
                    readValue(new DirectBufferInputStream(buffer, offset, length),
                        AeronIPC.class));
              } catch (Exception e) {
                log.error("error unicast", e);
              }
            }))
        .build();

    es.submit(() -> {
      long count = 0;
      IdleStrategy idleStrategy = new BackoffIdleStrategy(1, 1, 1, 1);
      log.info("start embeddedAeron polling");
      while (true) {
        try {
          count = subscriptionMap.entrySet().stream()
              .mapToInt(entry -> entry.getKey().poll(entry.getValue(), 10))
              .count();
          if (count == 0) {
            idleStrategy.idle();
          } else {
            idleStrategy.reset();
          }
          log.debug("aeron check " + count);
        } catch (Exception e) {
          e.printStackTrace();
        }
      }
    });
  }
}

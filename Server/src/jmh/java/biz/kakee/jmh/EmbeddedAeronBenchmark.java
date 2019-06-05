package biz.kakee.jmh;

import biz.kakee.aeron.Constants;
import biz.kakee.aeron.EmbeddedAeron;
import io.aeron.FragmentAssembler;
import io.aeron.Publication;
import io.aeron.Subscription;
import io.aeron.logbuffer.Header;
import org.agrona.DirectBuffer;
import org.agrona.concurrent.BusySpinIdleStrategy;
import org.agrona.concurrent.IdleStrategy;
import org.agrona.concurrent.UnsafeBuffer;
import org.openjdk.jmh.annotations.Benchmark;
import org.openjdk.jmh.annotations.BenchmarkMode;
import org.openjdk.jmh.annotations.Fork;
import org.openjdk.jmh.annotations.Group;
import org.openjdk.jmh.annotations.GroupThreads;
import org.openjdk.jmh.annotations.Level;
import org.openjdk.jmh.annotations.Measurement;
import org.openjdk.jmh.annotations.Mode;
import org.openjdk.jmh.annotations.OutputTimeUnit;
import org.openjdk.jmh.annotations.Scope;
import org.openjdk.jmh.annotations.Setup;
import org.openjdk.jmh.annotations.State;
import org.openjdk.jmh.annotations.TearDown;
import org.openjdk.jmh.annotations.Warmup;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.concurrent.TimeUnit;

@BenchmarkMode({Mode.AverageTime, Mode.Throughput})
@Warmup(iterations = 1)
@Measurement(iterations = 1)
@Fork(1)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
public class EmbeddedAeronBenchmark {
    @State(Scope.Group)
    public static class AeronDriver {
        /*
        Publication publication = EmbeddedAeron.addPub(Constants.Channel.WebSocket, Constants.Stream.WebSocket);


        FragmentAssembler fragmentAssembler = new FragmentAssembler(
                (DirectBuffer buffer, int offset, int length, Header header) -> {
                    byte[] data = new byte[length];
                    buffer.getBytes(offset, data);
                    System.out.println("got " + new String(data));
                });
        Subscription subscription = EmbeddedAeron.addSub(Constants.Channel.WebSocket, Constants.Stream.WebSocket,
                fragmentAssembler
        );
                */


        @Setup(Level.Trial)
        public void setup() {
        }

        @TearDown(Level.Trial)
        public void tearDown() throws IOException {
        }
    }

    @Benchmark
    @Group("aeron")
    @GroupThreads(2)
    public void publication(AeronDriver driver) {
        /*
        UnsafeBuffer unsafeBuffer = new UnsafeBuffer(ByteBuffer.allocateDirect(1024));
        final String message = "Hello World! ";
        final byte[] messageBytes = message.getBytes();
        unsafeBuffer.putBytes(0, messageBytes);
        while (!driver.publication.isConnected()) {
            //System.out.println("not yet");
        }
        long a = driver.publication.offer(unsafeBuffer, 0, messageBytes.length);
        //System.out.println("send");
        */
    }

    @Benchmark
    @Group("aeron")
    @GroupThreads(1)
    public void subscription(AeronDriver driver) {
        /*
        IdleStrategy idleStrategy = new BusySpinIdleStrategy();
        idleStrategy.idle(driver.subscription.poll(driver.fragmentAssembler, 1));
        */
    }
}

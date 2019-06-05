package biz.kakee.aeron;

public interface Constants {
    interface Channel {
        // https://en.wikipedia.org/wiki/Multicast_address
        // one of the unassigned User Ports (1024-49151)
        String WebSocket = "aeron:udp?group=224.0.0.1:16888";
    }

    interface Stream {
        int WebSocket = 10;
    }
}

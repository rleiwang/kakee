package biz.kakee.handlers.operator;

import biz.kakee.aeron.EmbeddedAeron;
import biz.kakee.aeron.ipc.AeronIPC;
import biz.kakee.handlers.common.AbstractOrderPaymentsHandler;
import biz.kakee.pvo.events.OnlineMember;
import biz.kakee.pvo.events.request.common.OfflineMessage;
import biz.kakee.pvo.events.request.operator.OrderPaid;
import biz.kakee.pvo.events.response.operator.SafeDeleteEvent;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Session;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.extern.slf4j.Slf4j;

import java.util.UUID;
import java.util.concurrent.CompletionStage;
import java.util.function.BiConsumer;
import java.util.function.Function;

@Slf4j
public class OrderPaymentsHandler extends AbstractOrderPaymentsHandler {
    public OrderPaymentsHandler(Session session) {
        super(session);
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onOrderPaid(final OrderPaid orderPaid) {
        searchOnlineMember(orderPaid.getDest())
                .thenCombine(updateOrdersPayments(orderPaid), (member, rows) -> member)
                .thenCompose(publishOrderPaid(orderPaid))
                .whenComplete(onOrderPaidComplete(orderPaid));
    }

    private CompletionStage<ResultSet> updateOrdersPayments(OrderPaid orderPaid) {
        return updateOrdersPayments(orderPaid.getPayments(), UUID.fromString(orderPaid.getOrderId()),
                orderPaid.getSrc().getId(), orderPaid.getDest().getId());
    }

    private Function<OnlineMember, CompletionStage<Long>> publishOrderPaid(OrderPaid orderPaid) {
        return member -> EmbeddedAeron.sendUniCast(member.getChannel(), member.getStreamId(), orderPaid,
                new AeronIPC.OffLine(OrderPaid.class.getSimpleName(), 0), false);
    }

    private BiConsumer<Long, Throwable> onOrderPaidComplete(OrderPaid orderPaid) {
        return (pos, exp) -> {
            if (exp != null) {
                log.error("save offline, unable publish Aeron messsage " + orderPaid, exp);
                asyncEventBus.post(new OfflineMessage(orderPaid.getDest().getId(), OrderPaid.class.getSimpleName(),
                        0, orderPaid));
            } else if (orderPaid.getSeqId() > 0) {
                SafeDeleteEvent safeDeleteEvent = new SafeDeleteEvent(orderPaid.getSeqId());
                Utils.replyObjectMsg(orderPaid.getSession(), safeDeleteEvent);
            }
        };
    }
}

package biz.kakee.db;

import biz.kakee.Conf;
import biz.kakee.handlers.common.ChatEventHandler;
import biz.kakee.handlers.common.CommonEventHandler;
import biz.kakee.handlers.common.ConnectionHandler;
import biz.kakee.handlers.common.DialogueEventHandler;
import biz.kakee.handlers.operator.AnnouncementsHandler;
import biz.kakee.handlers.operator.BillingsHandler;
import biz.kakee.handlers.operator.OperatorEventHandler;
import biz.kakee.handlers.operator.OrderPaymentsHandler;
import biz.kakee.handlers.operator.PaypalOAuthHandler;
import biz.kakee.handlers.operator.PendingOrdersHandler;
import biz.kakee.handlers.operator.PreFlightCheckListHandler;
import biz.kakee.handlers.operator.ProfilesHandler;
import biz.kakee.handlers.operator.ReportsHandler;
import biz.kakee.handlers.operator.ResetPasscodeHandler;
import biz.kakee.handlers.operator.SignUpHandler;
import biz.kakee.handlers.operator.SiteOrderHandler;
import biz.kakee.handlers.operator.SpecialOffersHandler;
import biz.kakee.handlers.operator.TxReceiptHandler;
import biz.kakee.handlers.user.OrderHistoryEventHandler;
import biz.kakee.handlers.user.PaypalPaymentHandler;
import biz.kakee.handlers.user.PreferencesHandler;
import biz.kakee.handlers.user.ReferralEventHandler;
import biz.kakee.handlers.user.SearchingFoodTrucksHandler;
import biz.kakee.handlers.user.UserEventHandler;
import biz.kakee.pvo.Env;
import biz.kakee.pvo.events.JournalEvent;
import biz.kakee.pvo.geo.Coordinate;
import biz.kakee.pvo.geo.DMS;
import biz.kakee.pvo.geo.GeoLocation;
import biz.kakee.pvo.geo.Region;
import com.datastax.driver.core.Cluster;
import com.datastax.driver.core.CodecRegistry;
import com.datastax.driver.core.ConsistencyLevel;
import com.datastax.driver.core.QueryOptions;
import com.datastax.driver.core.Session;
import com.datastax.driver.extras.codecs.jdk8.InstantCodec;
import com.datastax.driver.mapping.MappingManager;

import java.util.ArrayList;
import java.util.List;

public class Cassandra {
    private final Cluster cluster;
    private final Session session;

    private final List<CassandraEventHandler> eventHandlers = new ArrayList<>();

    public Cassandra(Conf conf) {
        QueryOptions options = new QueryOptions();
        options.setConsistencyLevel(ConsistencyLevel.LOCAL_ONE);

        CodecRegistry codecRegistry = new CodecRegistry();

        Conf.CassandraConf cassandraConf = conf.getCassandraConf();
        cluster = Cluster.builder()
                .withCodecRegistry(codecRegistry)
                .withQueryOptions(options)
                .addContactPoint(cassandraConf.getHost()).build();

        session = cluster.connect(cassandraConf.getKeySpace());

        MappingManager mappingManager = new MappingManager(session);

        codecRegistry.register(InstantCodec.instance,
                mappingManager.udtCodec(Region.class),
                mappingManager.udtCodec(DMS.class),
                mappingManager.udtCodec(Coordinate.class),
                mappingManager.udtCodec(JournalEvent.class),
                mappingManager.udtCodec(GeoLocation.class));
    }

    public Cassandra(Conf conf, char[] passwd) {
        this(conf);

        // common
        eventHandlers.add(new ConnectionHandler(session));
        eventHandlers.add(new DialogueEventHandler(session));
        eventHandlers.add(new ChatEventHandler(session));
        eventHandlers.add(new CommonEventHandler(session));

        // user
        eventHandlers.add(new UserEventHandler(session));
        eventHandlers.add(new PreferencesHandler(session));
        eventHandlers.add(new OrderHistoryEventHandler(session));
        eventHandlers.add(new SearchingFoodTrucksHandler(session));
        eventHandlers.add(new ReferralEventHandler(session));
        eventHandlers.add(new PaypalPaymentHandler(session, passwd));

        Conf.PayPalConf.Env payPalEnv = Env.isProd ? conf.getPayPalConf().getProd() :
                conf.getPayPalConf().getSandbox();

        // operator
        eventHandlers.add(new SignUpHandler(session));
        eventHandlers.add(new ResetPasscodeHandler(session));
        eventHandlers.add(new OperatorEventHandler(session));
        eventHandlers.add(new ReportsHandler(session));
        eventHandlers.add(new AnnouncementsHandler(session));
        eventHandlers.add(new SpecialOffersHandler(session));
        eventHandlers.add(new PreFlightCheckListHandler(session));
        eventHandlers.add(new ProfilesHandler(session));
        eventHandlers.add(new BillingsHandler(session, payPalEnv, passwd, conf.getCommission()));
        eventHandlers.add(new OrderPaymentsHandler(session));
        eventHandlers.add(new SiteOrderHandler(session));
        eventHandlers.add(new PendingOrdersHandler(session));
        eventHandlers.add(new TxReceiptHandler(session));
        eventHandlers.add(new PaypalOAuthHandler(session, payPalEnv, passwd));
    }

    public Cluster getCluster() {
        return cluster;
    }

    public Session getSession() {
        return session;
    }
}
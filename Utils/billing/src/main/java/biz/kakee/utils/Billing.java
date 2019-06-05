package biz.kakee.utils;

import biz.kakee.Conf;
import biz.kakee.db.Cassandra;
import biz.kakee.pvo.events.request.operator.OrderStatus;
import com.beust.jcommander.JCommander;
import com.beust.jcommander.Parameter;
import com.datastax.driver.core.BoundStatement;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.utils.UUIDs;
import org.apache.commons.lang3.RandomStringUtils;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.stratio.cassandra.lucene.builder.Builder.contains;
import static com.stratio.cassandra.lucene.builder.Builder.search;

public class Billing {
    // rate should be the same as in config.xml
    private static final double rate = 0.0295;

    private static class Account {
        private long ts;
        private int free;
        private int grace;
    }

    public static class Options {
        @Parameter(description = "Files")
        private List<String> files = new ArrayList<>();
    }

    public static void main(String[] argv) {
        Options options = new Options();
        new JCommander(options, argv);

        Conf.CassandraConf cassandraConf = new Conf.CassandraConf();
        cassandraConf.setHost("cassandra-host");
        cassandraConf.setKeySpace("kakee");

        Conf conf = new Conf();
        conf.setCassandraConf(cassandraConf);

        Cassandra cassandra = new Cassandra(conf);

        Session session = cassandra.getSession();

        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        ZonedDateTime lastMonth = now.minusMonths(1);

        String monthly = String.format("%d%d", lastMonth.getYear(), lastMonth.getMonthValue());
        System.out.println("Start to process " + monthly);

        ZonedDateTime firstDayOfMonth = lastMonth.with(TemporalAdjusters.firstDayOfMonth());
        firstDayOfMonth = firstDayOfMonth.withHour(0).withMinute(0).withSecond(0).withNano(0);
        ZonedDateTime last = now.with(TemporalAdjusters.firstDayOfMonth());
        last = last.withHour(0).withMinute(0).withSecond(0).withNano(0);

        System.out.println("first epoch time in seconds " + firstDayOfMonth.toEpochSecond() + ", >= " + firstDayOfMonth);
        System.out.println("last epoch time in seconds " + last.toEpochSecond() + ", < " + last);

        PreparedStatement p = session.prepare("select operatorId from monthly_billable where monthly = :monthly");
        BoundStatement bs = p.bind().setString("monthly", monthly);
        ResultSet rs = session.execute(bs);

        List<String> operators = rs.all().stream()
            .map(r -> r.getString("operatorId"))
            .collect(Collectors.toList());
        System.out.println(operators);

        UUID start = UUIDs.startOf(firstDayOfMonth.toEpochSecond() * 1000);
        UUID end = UUIDs.endOf(last.toEpochSecond() * 1000);

        System.out.println("start=" + UUIDs.unixTimestamp(start) + ", end=" + UUIDs.unixTimestamp(end));

        PreparedStatement order = session.prepare("select orderId from operator_orders where operatorId = :operatorId" +
            " and orderId >= :start and orderId < :end");

        PreparedStatement subtals = session.prepare("select sum(subtotal) as sales from orders where orderId in :ids " +
            "and expr(orders_index, :query)");

        PreparedStatement billing = session.prepare("insert into bills (operatorId, end, start, invoice, " +
            "ads, commission, grace, sales, unpaid) values (:operatorId, :end, :start, :invoice, :ads, " +
            ":commission, :grace, :sales, true) if not exists");

        PreparedStatement acct = session.prepare("select ts, free, grace from accounts where operatorId = :operatorId");

        Random random = new SecureRandom(Long.toString(System.currentTimeMillis()).getBytes());
        int cnt = 1;
        for (String operator : operators) {
            rs = session.execute(acct.bind().setString("operatorId", operator));

            Account acctInfo = rs.all().stream()
                .findFirst()
                .map(r -> {
                    Account account = new Account();
                    account.ts = UUIDs.unixTimestamp(r.getUUID("ts"));
                    account.free = r.getInt("free");
                    account.grace = r.getInt("grace");
                    return account;
                }).get();

            Instant freeTrialEnds = Instant.ofEpochMilli(acctInfo.ts).plus(acctInfo.free, ChronoUnit.DAYS);

            if (acctInfo == null) {
                System.out.println("unable to locate account info for " + operator);
                continue;
            } else if (UUIDs.unixTimestamp(end) <= freeTrialEnds.toEpochMilli()) {
                System.out.println("skipping " + operator + ", free trial ends at " +
                    LocalDateTime.ofInstant(freeTrialEnds, ZoneId.systemDefault()));
                continue;
            }

            if (UUIDs.unixTimestamp(start) < freeTrialEnds.toEpochMilli()) {
                System.out.println("adjust " + operator + " billing free trial ends at " +
                    LocalDateTime.ofInstant(freeTrialEnds, ZoneId.systemDefault()));
                start = UUIDs.startOf(freeTrialEnds.toEpochMilli());
            }

            BoundStatement boundStatement = order.bind()
                .setString("operatorId", operator)
                .setUUID("start", start)
                .setUUID("end", end);

            rs = session.execute(boundStatement);

            List<UUID> orders = rs.all().stream()
                .map(r -> r.getUUID("orderId"))
                .collect(Collectors.toList());

            System.out.println(orders);

            if (orders.size() == 0) {
                System.out.println("skip " + operator + ", no billable orders after apply free trial period");
                continue;
            }

            rs = session.execute(subtals.bind()
                .setList("ids", orders, UUID.class)
                .setString("query", buildOrderStatus()));
            float sum = rs.all().stream()
                .findFirst()
                .map(r -> r.getFloat("sales"))
                .orElse(0F);

            BigDecimal sales = new BigDecimal(sum);
            sales = sales.setScale(2, BigDecimal.ROUND_HALF_UP);

            BigDecimal commission = sales.multiply(new BigDecimal(rate));
            commission = commission.setScale(2, BigDecimal.ROUND_HALF_UP);

            System.out.println("total sales " + sum);

            /*
            d) values (:operatorId, :end, :start, :invoice, :ads, " +
                ":commission, :grace, :sales, true) if not exists");

             */
            rs = session.execute(billing.bind()
                .setString("operatorId", operator)
                .setUUID("end", end)
                .setUUID("start", start)
                .setString("invoice", String.format("%d%s%s", cnt, monthly, randomNumeric(random)))
                .setDouble("ads", 0D)
                .setDouble("commission", commission.doubleValue())
                .setInt("grace", acctInfo.grace)
                .setDouble("sales", sales.doubleValue()));

            if (rs.wasApplied()) {
                System.out.println("bill generated for " + operator + " for " + monthly);
            } else {
                System.out.println("bill not generated for " + operator + " for " + monthly);
            }
            cnt++;
        }

        System.out.println(cassandra.getCluster().getClusterName());
        cassandra.getCluster().close();
    }

    private static String buildOrderStatus() {
        return search()
            .filter(contains("status", OrderStatus.Status.Open.name(),
                OrderStatus.Status.Ready.name(), OrderStatus.Status.Closed.name()))
            .build();
    }

    private static String randomNumeric(Random random) {
        return RandomStringUtils.random(4, 0, 0, false, true, null, random);
    }
}

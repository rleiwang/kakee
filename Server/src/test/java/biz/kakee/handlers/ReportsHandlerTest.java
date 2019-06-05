package biz.kakee.handlers;

import biz.kakee.db.Cassandra;
import biz.kakee.handlers.operator.ReportsHandler;
import biz.kakee.pvo.events.Channel;
import biz.kakee.pvo.events.Identity;
import biz.kakee.pvo.events.request.operator.Report;
import biz.kakee.pvo.events.response.common.SalesReport;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Before;
import org.junit.Test;

import java.util.ArrayList;
import java.util.List;

public class ReportsHandlerTest {
    private Cassandra cassandra;


    @Before
    public void setUp() {
        cassandra = new Cassandra("localhost", "kakee");



    }

    @Test
    public void onReport() throws Exception {
        ReportsHandler reportsHandler = new ReportsHandler(cassandra.getSession());

        Report report = new Report();
        report.setBefore(System.currentTimeMillis());
        report.setAfter(System.currentTimeMillis() - (10*24*60*60*1000));
        report.setSrc(new Identity("D907D279-5D40-456D-A33A-541D33905A92", Channel.operator));
        reportsHandler.onReport(report);

        //Thread.sleep(5000);
    }

    @Test
    public void test() throws Exception {
        String msg = "[{\"items\":[{\"name\":\"Burrito\",\"price\":\"9.25\",\"quantity\":\"1\",\"subItems\":[{\"name\":\"chicken\"}]}]}, {\"items\":[{\"name\":\"Burrito\",\"price\":\"9.25\",\"quantity\":\"1\",\"subItems\":[{\"name\":\"Steak\",\"price\":\"1\"}]}]}]";

        List<SalesReport> reports = new ArrayList<>();

        List<SalesReport> b = new ObjectMapper().readValue(msg, reports.getClass());

        System.out.println(b);
    }
}
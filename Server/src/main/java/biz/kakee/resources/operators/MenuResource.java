package biz.kakee.resources.operators;

import biz.kakee.db.Cassandra;
import biz.kakee.pvo.Menu;
import biz.kakee.pvo.User;
import biz.kakee.resources.auth.AuthUser;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Row;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.annotation.security.RolesAllowed;
import javax.validation.constraints.NotNull;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Produces;
import javax.ws.rs.core.CacheControl;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.EntityTag;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Request;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class MenuResource {
    private final Cassandra cassandra;

    private final String operatorId;

    public MenuResource(Cassandra cassandra, String id) {
        this.cassandra = cassandra;
        this.operatorId = id;
    }

    @GET
    @RolesAllowed({User.CUSTOMER, User.OPERATOR})
    public Response get(@Context Request req, @AuthUser User user) throws Exception {

        ResultSet rs = cassandra.getSession().execute("select * from menu where operatorId = '" + operatorId +
                "' order by version desc limit 1");

        List<Row> rows = rs.all();

        if (rows.size() > 0) {
            UUID version = rows.get(0).getUUID("version");
            Menu menu = new ObjectMapper().readValue(rows.get(0).getString("menu"), Menu.class);

            EntityTag etag = new EntityTag(version.toString());

            CacheControl cc = new CacheControl();
            cc.setNoCache(true);
            Response.ResponseBuilder rb = req.evaluatePreconditions(etag);
            if (rb != null) {
                return rb.cacheControl(cc).tag(etag).build();
            }

            return Response.ok(menu).tag(etag).build();
        }
        return Response.status(Response.Status.NOT_FOUND).build();
    }

    @POST
    @RolesAllowed(User.OPERATOR)
    public Response set(@NotNull Menu menu) throws Exception {
        List<Row> rows = cassandra.getSession().execute("SELECT NOW() FROM system.local").all();
        UUID timeUUID = rows.get(0).getUUID(0);

        Map<String, String> elements = new HashMap<>();

        elements.put("operatorId", operatorId);
        elements.put("version", timeUUID.toString());
        menu.setVersion(timeUUID.toString());
        elements.put("menu", new ObjectMapper().writeValueAsString(menu));


        cassandra.getSession().execute("INSERT INTO menu JSON '" + new ObjectMapper().writeValueAsString(elements) + "'");

        return Response.ok().build();
    }
}

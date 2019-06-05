package biz.kakee.utils;

import biz.kakee.Conf;
import biz.kakee.external.gmail.GmailService;
import biz.kakee.handlers.HandlerUtils;
import biz.kakee.pvo.dto.Account;
import biz.kakee.pvo.dto.Installation;
import biz.kakee.pvo.dto.SignUpDevice;
import com.beust.jcommander.JCommander;
import com.beust.jcommander.Parameter;
import com.datastax.driver.core.Cluster;
import com.datastax.driver.core.CodecRegistry;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Session;
import com.datastax.driver.core.utils.UUIDs;
import com.datastax.driver.extras.codecs.jdk8.InstantCodec;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.google.api.services.gmail.model.Message;
import com.google.common.collect.ImmutableSet;
import com.google.maps.GeoApiContext;
import com.google.maps.GeocodingApi;
import com.google.maps.model.AddressComponent;
import com.google.maps.model.AddressComponentType;
import com.google.maps.model.Bounds;
import com.google.maps.model.GeocodingResult;
import com.google.maps.model.LatLng;
import com.google.maps.model.LocationType;
import io.dropwizard.jackson.Jackson;

import java.io.Console;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import static biz.kakee.external.gmail.GmailService.createEmail;
import static com.google.maps.model.AddressComponentType.*;
import static com.stratio.cassandra.lucene.builder.Builder.*;


public class Reporter {

    private static Set<AddressComponentType> types = ImmutableSet.of(LOCALITY, POSTAL_CODE, ADMINISTRATIVE_AREA_LEVEL_1);

    static class Options {
        @Parameter(description = "Files")
        private List<String> files = new ArrayList<>();

        @Parameter(names = "-conf", description = "configuration file", required = true)
        private String conf;

        @Parameter(names = "-hours", description = "hours before", required = true)
        private int hours;
    }

    public static void main(String[] argv) throws Exception {
        Options options = new Options();
        new JCommander(options, argv);

        Conf conf = Jackson.newObjectMapper(new YAMLFactory()).readValue(Paths.get(options.conf).toFile(), Conf.class);

        char[] password = readPassword();

        String apiKey = Crypto.decryptWithPasswd(password, conf.getGoogleConf().getApi());

        GmailService.start(conf.getGoogleConf().getGmail(), password);

        CodecRegistry codecRegistry = new CodecRegistry();
        codecRegistry.register(InstantCodec.instance);
        Cluster cluster = Cluster.builder()
                .withCodecRegistry(codecRegistry)
                .addContactPoint(conf.getCassandraConf().getHost()).build();

        Session session;
        try {
            session = cluster.connect(conf.getCassandraConf().getKeySpace());
            DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss.SSS Z");
            ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
            String nowTS = dateTimeFormatter.format(now);
            String earlierTS = dateTimeFormatter.format(now.minusHours(options.hours));
            ResultSet rs = session.execute("SELECT * FROM installations WHERE expr(installations_index, ?)",
                    search().filter(bool().must(
                            range("ts").lower(earlierTS).includeLower(true),
                            range("ts").upper(nowTS).includeUpper(false))
                    ).build());

            // iid -> installation
            Map<String, Installation> newInstallations = rs.all().stream()
                    .map(HandlerUtils::toInstallation)
                    .reduce(new HashMap<String, Installation>(),
                            (map, installation) -> {
                                Installation existing = map.get(installation.getIid());
                                if (existing == null) {
                                    map.put(installation.getIid(), installation);
                                } else if (existing.getTs().isAfter(installation.getTs())) {
                                    map.replace(existing.getIid(), installation);
                                }

                                return map;
                            },
                            (left, right) -> left);

            rs = session.execute("SELECT iid FROM installations WHERE iid IN ? AND expr(installations_index, ?)",
                    newInstallations.keySet(),
                    search().filter(range("ts").upper(earlierTS).includeUpper(false)).build());

            // previous installed, it's just new version
            Set<String> newVersions = rs.all().stream()
                    .map(r -> r.getString("iid"))
                    .collect(Collectors.toSet());

            Map<String, Map<String, Installation>> newInstallsByApp = new HashMap<>();
            newInstallsByApp.put("com.tristonetech.kakee.Operator", new HashMap<>());
            newInstallsByApp.put("com.tristonetech.kakee.User", new HashMap<>());

            newInstallsByApp = newInstallations.entrySet().stream()
                    .filter(entry -> !newVersions.contains(entry.getKey()))
                    .reduce(newInstallsByApp,
                            (map, entry) -> {
                                Map<String, Installation> app = map.get(entry.getValue().getBundle_id());
                                app.put(entry.getKey(), entry.getValue());
                                return map;
                            },
                            (left, right) -> left);

            Map<String, Installation> newOperators = newInstallsByApp.get("com.tristonetech.kakee.Operator");
            Map<String, Installation> newUsers = newInstallsByApp.get("com.tristonetech.kakee.User");

            List<String> mids = new ArrayList<>();
            mids.addAll(newOperators.keySet());
            mids.addAll(newUsers.keySet());

            rs = session.execute("SELECT * FROM sessions WHERE mid IN ? AND expr(sessions_index, ?)",
                    mids, search().filter(match("activity", "login")).build());

            Map<String, String> postalCodes = rs.all().stream()
                    .reduce(new HashMap<String, String>(),
                            (map, row) -> {
                                float lat = row.getFloat("latitude");
                                float lng = row.getFloat("longitude");
                                ResultSet cbRS = session.execute("SELECT * FROM city_bounds WHERE expr(city_bounds_index, ?)",
                                        search().filter(bool().must(
                                                range("ne_lat").lower(lat).includeLower(true),
                                                range("sw_lat").upper(lat).includeUpper(true),
                                                range("ne_lng").lower(lng).includeLower(true),
                                                range("sw_lng").upper(lng).includeUpper(true))
                                        ).build());

                                String postalCode = cbRS.all().stream()
                                        .findFirst()
                                        .map(r -> r.getString("postal_code"))
                                        .orElseGet(fetchGeoCoding(apiKey, lat, lng, session));

                                map.put(row.getString("mid"), postalCode);

                                return map;
                            },
                            (left, right) -> left);

            // operatorId is asc, ts is desc
            rs = session.execute("SELECT * FROM signup_devices WHERE iid in ?", newOperators.keySet());

            // iid -> signup device
            Map<String, SignUpDevice> signupDevices = rs.all().stream()
                    .map(HandlerUtils::toSignUpDevice)
                    .reduce(new HashMap<String, SignUpDevice>(),
                            (map, device) -> {
                                SignUpDevice existing = map.get(device.getIid());
                                if (existing == null) {
                                    map.put(device.getIid(), device);
                                } else if (UUIDs.unixTimestamp(existing.getTs()) < UUIDs.unixTimestamp(device.getTs())) {
                                    map.replace(device.getIid(), device);
                                }

                                return map;
                            },
                            (left, right) -> left);

            // operatorId -> sigup devices
            Map<String, SignUpDevice> newSignUps = newOperators.entrySet().stream()
                    .map(i -> signupDevices.get(i.getKey()))
                    .collect(Collectors.toMap(s -> s.getOperatorId(), s -> s));

            List<Account> newAccounts = newSignUps.entrySet().stream()
                    .map(e -> {
                        ResultSet ars = session.execute("SELECT * FROM accounts WHERE operatorId = ? AND ts = ?",
                                e.getValue().getOperatorId(), e.getValue().getTs());

                        return ars.all().stream()
                                .findFirst()
                                .map(r -> HandlerUtils.toAccount(r))
                                .orElseThrow(RuntimeException::new);
                    }).collect(Collectors.toList());

            String title = String.format("%d accounts, %d operators, %d users",
                    newAccounts.size(), newOperators.size(), newUsers.size());

            StringBuilder body = new StringBuilder("accounts\n");
            body = newAccounts.stream()
                    .reduce(body,
                            (sb, acct) -> {
                                sb.append(String.format("zip=%s,truckId=%s,iid=%s,email=%s\n",
                                        acct.getPostalCode(), acct.getOperatorId(), acct.getIid(), acct.getEmail()));
                                return sb;
                            },
                            (left, right) -> left);
            body.append("\noperators\n");
            body = newOperators.entrySet().stream()
                    .reduce(body,
                            (sb, entry) -> {
                                sb.append(String.format("zip=%s,iid=%s\n", postalCodes.get(entry.getKey()),
                                        entry.getKey()));
                                return sb;
                            },
                            (left, right) -> left);
            body.append("\nusers\n");
            body = newUsers.entrySet().stream()
                    .reduce(body,
                            (sb, entry) -> {
                                sb.append(String.format("zip=%s,iid=%s\n", postalCodes.get(entry.getKey()),
                                        entry.getKey()));
                                return sb;
                            },
                            (left, right) -> left);

            Message msg = createEmail("rluwang@usa.net", "me", title, body.toString());
            GmailService.getGamil().users().messages().send("me", msg).execute();

            session.close();
        } finally {
            cluster.close();
        }
    }

    private static Supplier<String> fetchGeoCoding(String apiKey, float lat, float lng, Session session) {
        return () -> {
            String postalCode = "";
            if (lat == 0f && lng == 0f) {
                return postalCode;
            }
            try {
                GeoApiContext context = new GeoApiContext().setApiKey(apiKey.trim());
                // 37.782897, -122.410820, San Francisco
                // 37.790436, -121.946949 San Ramon
                LatLng latLng = new LatLng(lat, lng);
                GeocodingResult[] results = GeocodingApi.reverseGeocode(context, latLng).await();
                if (results != null) {
                    for (GeocodingResult result : results) {
                        if (result.geometry == null || result.geometry.viewport == null ||
                                result.geometry.locationType != LocationType.APPROXIMATE) {
                            continue;
                        }
                        Map<AddressComponentType, String> addrs = new HashMap<>();
                        for (AddressComponent addr : result.addressComponents) {
                            for (AddressComponentType type : addr.types) {
                                if (types.contains(type)) {
                                    addrs.put(type, addr.longName);
                                }
                            }
                        }
                        if (addrs.size() == types.size()) {
                            if (result.geometry != null) {
                                Bounds bounds = result.geometry.bounds;
                                if (bounds != null) {
                                    ResultSet insertRS = session.execute("INSERT INTO city_bounds " +
                                                    "(postal_code, city, state, ne_lat, ne_lng, sw_lat, sw_lng) VALUES" +
                                                    " (?, ?, ?, ?, ?, ?, ?)",
                                            addrs.get(POSTAL_CODE), addrs.get(LOCALITY), addrs.get(ADMINISTRATIVE_AREA_LEVEL_1),
                                            bounds.northeast.lat, bounds.northeast.lng,
                                            bounds.southwest.lat, bounds.southwest.lng);
                                    System.out.println(addrs.toString());
                                    System.out.println(new ObjectMapper().writeValueAsString(result.geometry));
                                    System.out.println("execution " + (insertRS.wasApplied() ? "ok" : "failed"));
                                }
                            }

                            postalCode = addrs.get(POSTAL_CODE);
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            return postalCode;
        };
    }

    private static char[] readPassword() throws Exception {
        Console console = System.console();
        if (console == null) {
            byte[] data = Files.readAllBytes(Paths.get(".password"));
            int padding = 0;
            for (int last = data.length - 1; last >= 0; last--) {
                if (Character.isWhitespace(data[last])) {
                    padding++;
                }
            }
            return new String(Arrays.copyOf(data, data.length - padding), StandardCharsets.UTF_8).toCharArray();
        }
        return console.readPassword("Please enter password:");
    }
}

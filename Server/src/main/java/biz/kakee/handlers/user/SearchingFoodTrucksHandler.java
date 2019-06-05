package biz.kakee.handlers.user;

import biz.kakee.pvo.events.request.common.SpecialOffer;
import biz.kakee.pvo.events.request.user.SearchingFoodTrucks;
import biz.kakee.pvo.events.response.user.FoundFoodTrucks;
import biz.kakee.pvo.events.response.user.OpenOrders;
import biz.kakee.pvo.geo.GeoLocation;
import biz.kakee.websockets.Utils;
import com.datastax.driver.core.PreparedStatement;
import com.datastax.driver.core.ResultSet;
import com.datastax.driver.core.Row;
import com.datastax.driver.core.Session;
import com.google.common.eventbus.AllowConcurrentEvents;
import com.google.common.eventbus.Subscribe;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.BiFunction;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.stratio.cassandra.lucene.builder.Builder.*;

@Slf4j
public class SearchingFoodTrucksHandler extends UserSearchPreferenceHandler {

    @Data
    static class TruckLocation {
        private final GeoLocation location;
        private final boolean isOnline;
    }

    @Data
    static class FoodTruckSearchResult {
        private final String scrollId;
        private final Map<String, FoundFoodTrucks.FoodTruck> foodTrucks;
    }

    private final DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss.SSS Z");

    private final PreparedStatement selPrfStmt;
    private final PreparedStatement anceStmt;
    private final PreparedStatement searchFoodTruckStmt;
    private final PreparedStatement searchSpecialOfferStmt;
    private final PreparedStatement searchOperatorLogin;
    private final PreparedStatement searchOnlineOperator;

    public SearchingFoodTrucksHandler(Session session) {
        super(session);
        searchFoodTruckStmt = this.session.prepare("SELECT * FROM online_members WHERE " +
                "expr(online_members_index, :query)");

        searchSpecialOfferStmt = this.session.prepare("SELECT * FROM special_offers WHERE operatorId IN :ids " +
                "AND expr(special_offers_index, :query)");
        selPrfStmt = this.session.prepare("SELECT * FROM profiles WHERE operatorId IN :ids");
        anceStmt = session.prepare("SELECT operatorId, msg FROM announcements WHERE operatorId IN :ids");

        searchOperatorLogin = this.session.prepare("SELECT latitude, longitude FROM sessions WHERE mid = :operatorId " +
                "AND role = 'operator' AND activity = 'login' ORDER BY tmline DESC LIMIT 1 ALLOW FILTERING");

        searchOnlineOperator = this.session.prepare("SELECT latitude, longitude FROM online_members WHERE mid = " +
                ":operatorId AND role = 'operator' LIMIT 1 ALLOW FILTERING");
    }

    /**
     * posted by server after authorized
     *
     * @param openOrders
     */
    @Subscribe
    @AllowConcurrentEvents
    public void onOpenOrders(final OpenOrders openOrders) {
        searchExtra(openOrderTrucks(openOrders), openOrders.getSrc().getId())
                .thenCompose(trucks -> setFoodTruckLocations(trucks, openOrders))
                .whenComplete((oo, exp) -> {
                    if (exp != null) {
                        log.error("error searching open orders " + openOrders, exp);
                    } else {
                        Utils.replyObjectMsg(openOrders.getSession(), oo);
                    }
                });
    }

    private CompletableFuture<OpenOrders>
    setFoodTruckLocations(List<FoundFoodTrucks.FoodTruck> trucks, OpenOrders openOrders) {
        return CompletableFuture.allOf(
                trucks.stream()
                        .map(truck -> searchLocation(truck))
                        .collect(Collectors.toList())
                        .toArray(new CompletableFuture[trucks.size()])
        ).thenCompose(v -> {
            trucks.forEach(truck -> openOrders.getTrucks().add(truck));
            return CompletableFuture.completedFuture(openOrders);
        });
    }

    private Map<String, FoundFoodTrucks.FoodTruck> openOrderTrucks(OpenOrders openOrders) {
        return openOrders.getOrders().stream()
                .collect(Collectors.toMap(o -> o.getOperatorId(), o -> newFoodTruck(o.getOperatorId())));
    }

    private FoundFoodTrucks.FoodTruck newFoodTruck(String operatorId) {
        FoundFoodTrucks.FoodTruck foodTruck = new FoundFoodTrucks.FoodTruck();
        foodTruck.setOperatorId(operatorId);
        return foodTruck;
    }

    private CompletableFuture<FoundFoodTrucks.FoodTruck> searchLocation(FoundFoodTrucks.FoodTruck truck) {
        String operatorId = truck.getOperatorId();
        return execAsync(() -> searchOnlineOperator.bind().setString("operatorId", operatorId))
                .thenCombine(execAsync(() -> searchOperatorLogin.bind().setString("operatorId", operatorId)),
                        (online, login) -> {
                            Optional<GeoLocation> location = online.all().stream()
                                    .findFirst()
                                    .map(row -> {
                                        GeoLocation geoLocation = new GeoLocation();
                                        geoLocation.setLatitude(row.getFloat("latitude"));
                                        geoLocation.setLongitude(row.getFloat("longitude"));
                                        return geoLocation;
                                    });

                            if (location.isPresent()) {
                                truck.setLocation(location.get());
                                truck.setOnline(true);
                                return truck;
                            }

                            location = login.all().stream()
                                    .findFirst()
                                    .map(row -> {
                                        GeoLocation geoLocation = new GeoLocation();
                                        geoLocation.setLatitude(row.getFloat("latitude"));
                                        geoLocation.setLongitude(row.getFloat("longitude"));
                                        return geoLocation;
                                    });

                            truck.setLocation(location.get());
                            truck.setOnline(false);
                            return truck;
                        });
    }

    @Subscribe
    @AllowConcurrentEvents
    public void onSearchingFoodTrucks(final SearchingFoodTrucks event) {
        updateActivity(event);
        searchOnlineFoodTrucksWithinRegion(event)
            .thenCompose(searchSearchFoodTruckExtra(event))
            .whenComplete((foodTrucks, exp) -> {
                if (exp != null) {
                    log.error("error retrieving online food trucks " + event, exp);
                } else {
                    Utils.replyObjectMsg(event.getSession(),
                        applyFilter(Optional.ofNullable(event.getFilter()), foodTrucks));
                }
            });
    }

    private Function<FoodTruckSearchResult, CompletionStage<FoundFoodTrucks>>
    searchSearchFoodTruckExtra(SearchingFoodTrucks event) {
        return searchResult -> searchExtra(searchResult.getFoodTrucks(), event.getSrc().getId())
            .thenCompose(foodTrucks -> CompletableFuture.completedFuture(
                new FoundFoodTrucks(searchResult.getScrollId(), foodTrucks)
            ));
    }

    private CompletableFuture<FoodTruckSearchResult>
    searchOnlineFoodTrucksWithinRegion(SearchingFoodTrucks event) {
        return execAsync(() -> searchFoodTruckStmt.bind()
            .set("query", regionExpr(event), String.class)
            .setFetchSize(20))
            .thenCompose(rs -> CompletableFuture.completedFuture(
                new FoodTruckSearchResult(toScrollId(rs), rs.all().stream()
                    .map(this::toFoodTruck)
                    .collect(Collectors.toMap(FoundFoodTrucks.FoodTruck::getOperatorId, f -> f)))
                )
            );
    }

    private String toScrollId(ResultSet rs) {
        if (rs.getExecutionInfo() == null) {
            return null;
        } else if (rs.getExecutionInfo().getPagingState() == null) {
            return null;
        }
        return rs.getExecutionInfo().getPagingState().toString();
    }

    private FoundFoodTrucks applyFilter(Optional<SearchingFoodTrucks.Filter> filter, FoundFoodTrucks found) {
        return new FoundFoodTrucks(found.getScrollId(),
            filter.map(f -> found.getFoodTrucks().stream()
                .filter(truck -> !filterOut(f, truck))
                .collect(Collectors.toList()))
                .orElseGet(() -> found.getFoodTrucks()));
    }

    // true -> filter out trucks
    private boolean filterOut(SearchingFoodTrucks.Filter filter, FoundFoodTrucks.FoodTruck truck) {
        return NameNotMatch(filter.getName(), truck) || NoSpecialOffer(filter.isHasSpecialOffer(), truck) ||
                NotFavorite(filter.isFavorite(), truck) || NotTryOut(filter.isTryout(), truck) ||
                NotInCategories(filter.getCategories(), truck);
    }

    private boolean NameNotMatch(String term, FoundFoodTrucks.FoodTruck truck) {
        return term != null && !truck.getName().toLowerCase().contains(term.toLowerCase());
    }

    private boolean NoSpecialOffer(boolean hasSpecialOffer, FoundFoodTrucks.FoodTruck truck) {
        return hasSpecialOffer && truck.getSpecialOffer() == null;
    }

    private boolean NotFavorite(boolean favoriteOnly, FoundFoodTrucks.FoodTruck truck) {
        return favoriteOnly && !truck.isFavorite();
    }

    private boolean NotTryOut(boolean tryoutOnly, FoundFoodTrucks.FoodTruck truck) {
        return tryoutOnly && !truck.isTryout();
    }

    private boolean NotInCategories(final Set<String> categories, FoundFoodTrucks.FoodTruck truck) {
        return categories.size() > 0 && !categories.contains(truck.getCategory());
    }

    private CompletableFuture<List<FoundFoodTrucks.FoodTruck>>
    searchExtra(Map<String, FoundFoodTrucks.FoodTruck> trucks, String customerId) {
        return searchProfiles(trucks)
                .thenCombine(searchSpecialOffer(trucks), mergeSpecialOffer(trucks))
                .thenCombine(searchAnnouncement(trucks), mergeAnnouncement())
                .thenCombine(searchCustomerPreferences(customerId), mergePreferences());
    }

    private BiFunction<Map<String, FoundFoodTrucks.FoodTruck>, ResultSet, List<FoundFoodTrucks.FoodTruck>>
    mergePreferences() {
        return (trucks, rs) -> {
            rs.all().stream().findFirst().ifPresent(row -> {
                row.getSet("favorites", String.class).stream()
                        .forEach(operatorId -> Optional.ofNullable(trucks.get(operatorId))
                                .ifPresent(truck -> truck.setFavorite(true)));
                row.getSet("tryouts", String.class).stream()
                        .forEach(operatorId -> Optional.ofNullable(trucks.get(operatorId))
                                .ifPresent(truck -> truck.setTryout(true)));
            });

            return new ArrayList<>(trucks.values());
        };
    }


    private BiFunction<Map<String, FoundFoodTrucks.FoodTruck>, ResultSet, Map<String, FoundFoodTrucks.FoodTruck>>
    mergeAnnouncement() {
        return (foodTrucks, announcements) -> {
            announcements.all().stream()
                    .forEach(announcement -> {
                        FoundFoodTrucks.FoodTruck foodTruck = foodTrucks.get(announcement.getString("operatorId"));
                        if (foodTruck != null) {
                            foodTruck.setAnnouncement(announcement.getString("msg"));
                        }
                    });

            return foodTrucks;
        };
    }

    private CompletableFuture<ResultSet> searchAnnouncement(Map<String, FoundFoodTrucks.FoodTruck> trucks) {
        return execAsync(() -> anceStmt.bind()
                .setList("ids", new ArrayList<>(trucks.keySet()), String.class));
    }

    private BiFunction<ResultSet, ResultSet, Map<String, FoundFoodTrucks.FoodTruck>>
    mergeSpecialOffer(Map<String, FoundFoodTrucks.FoodTruck> trucks) {
        return (profiles, specialOffers) -> {
            // special offers if any
            specialOffers.all().stream()
                    .filter(r -> !SpecialOffer.Type.S.name().equals(r.getString("type")))
                    .forEach(r -> operatorDiscount(trucks.get(r.getString("operatorId")), r));
            // profiles
            return profiles.all().stream()
                    .map(r -> operatorProfile(trucks.get(r.getString("operatorId")), r))
                    .collect(Collectors.toMap(
                            FoundFoodTrucks.FoodTruck::getOperatorId,
                            t -> t)
                    );
        };
    }

    private CompletableFuture<ResultSet>
    searchProfiles(Map<String, FoundFoodTrucks.FoodTruck> trucks) {
        return execAsync(() -> selPrfStmt.bind()
                .setList("ids", new ArrayList<>(trucks.keySet()), String.class));
    }

    private CompletableFuture<ResultSet> searchSpecialOffer(Map<String, FoundFoodTrucks.FoodTruck> trucks) {
        return execAsync(() -> searchSpecialOfferStmt.bind()
                .setList("ids", new ArrayList<>(trucks.keySet()), String.class)
                .set("query", specialOfferExpr(), String.class));
    }

    private String specialOfferExpr() {
        String now = dateTimeFormatter.format(ZonedDateTime.now(ZoneOffset.UTC));
        return search().filter(bool().must(
                range("start_date").upper(now).includeUpper(true),
                range("end_date").lower(now).includeUpper(true)))
                .build();
    }


    private String regionExpr(SearchingFoodTrucks event) {
        return search().filter(bool().must(
                match("isopen", "true"),
                match("role", "operator"),
                geoBBox("place",
                        event.getLatitude() - event.getLatDelta(),
                        event.getLatitude() + event.getLatDelta(),
                        event.getLongitude() - event.getLongDelta(),
                        event.getLongitude() + event.getLongDelta())))
                .build();
    }

    private FoundFoodTrucks.FoodTruck toFoodTruck(Row row) {
        FoundFoodTrucks.FoodTruck truck = new FoundFoodTrucks.FoodTruck();
        truck.setOperatorId(row.getString("mid"));
        GeoLocation location = new GeoLocation();
        location.setLatitude(row.getFloat("latitude"));
        location.setLongitude(row.getFloat("longitude"));
        truck.setLocation(location);
        truck.setPending(row.getInt("pending"));
        truck.setCity(row.getString("city"));
        truck.setTaxRate(row.getFloat("taxRate") / 100F);
        return truck;
    }

    private FoundFoodTrucks.FoodTruck operatorProfile(FoundFoodTrucks.FoodTruck truck, Row row) {
        truck.setName(row.getString("name"));
        truck.setCategory(row.getString("category"));
        truck.setPhone(row.getString("phone"));
        truck.setPhoto(row.getString("photo"));
        truck.setPriceRange(row.getString("priceRange"));
        return truck;
    }

    private FoundFoodTrucks.FoodTruck operatorDiscount(FoundFoodTrucks.FoodTruck truck, Row row) {
        FoundFoodTrucks.SpecialOffer offer = new FoundFoodTrucks.SpecialOffer();
        offer.setStartDate(row.get("start_date", Instant.class).toEpochMilli());
        offer.setEndDate(row.get("end_date", Instant.class).toEpochMilli());
        offer.setDiscount(row.getFloat("discount"));
        truck.setSpecialOffer(offer);
        return truck;
    }
}

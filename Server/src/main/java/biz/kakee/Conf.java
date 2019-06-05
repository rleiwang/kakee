package biz.kakee;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.dropwizard.Configuration;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;

@Data
@EqualsAndHashCode(callSuper = true)
public class Conf extends Configuration {
    @Data
    public static class AeronConf {
        @Valid
        @NotNull
        @Getter
        @JsonProperty("interface")
        private String netIF;

        @Valid
        @NotNull
        @Getter
        private String dataDir;
    }

    @Data
    public static class CassandraConf {
        @Valid
        @NotNull
        @Getter
        private String host;

        @Valid
        @NotNull
        @Getter
        private String keySpace;
    }

    @Data
    public static class PayPalConf {

        @Data
        public static class Env {
            @Valid
            @NotNull
            @Getter
            private String apiKey;

            @Valid
            @NotNull
            @Getter
            private String accessCode;

            @Valid
            @NotNull
            @Getter
            private String localURI;

            @Valid
            @NotNull
            @Getter
            private String oauthURI;

            @Valid
            @NotNull
            @Getter
            private String apiURI;

            @Valid
            @NotNull
            @Getter
            private String[] scopes;
        }

        @Valid
        @NotNull
        @Getter
        private Env prod;

        @Valid
        @NotNull
        @Getter
        private Env sandbox;
    }

    @Data
    public static class GoogleConf {
        @Valid
        @NotNull
        @JsonProperty("gmail")
        @Getter
        private String gmail;

        @Valid
        @NotNull
        @JsonProperty("gcm")
        @Getter
        private String gcm;

        @Valid
        @NotNull
        @JsonProperty("api")
        @Getter
        private String api;
    }

    @Valid
    @NotNull
    @JsonProperty("paypal")
    @Getter
    private PayPalConf payPalConf;

    @Valid
    @NotNull
    @JsonProperty("google")
    @Getter
    private GoogleConf googleConf;

    @Valid
    @NotNull
    @JsonProperty("commission")
    @Getter
    private double commission;

    @Valid
    @NotNull
    @JsonProperty("cassandra")
    @Getter
    private CassandraConf cassandraConf;

    @Valid
    @NotNull
    @JsonProperty("aeron")
    @Getter
    private AeronConf aeronConf;
}

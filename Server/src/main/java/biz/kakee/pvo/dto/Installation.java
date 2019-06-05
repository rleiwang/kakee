package biz.kakee.pvo.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class Installation {
    private String iid;
    private String hash_code;
    private Instant ts;
    private String instance_id;
    private String device_id;
    private String manufacturer;
    private String model;
    private String brand;
    private String system_name;
    private String system_version;
    private String bundle_id;
    private String build_number;
    private String version;
    private String readable_version;
    private String device_name;
    private String user_agent;
    private String locale;
    private String country;
}

package biz.kakee.pvo.ui;

import lombok.Data;

/**
 * this marker has to be shared with Android project
 */
@Data
public class Marker {
    private String title;
    private String snippet;
    private double latitude;
    private double longitude;
    private byte[] icon;
}
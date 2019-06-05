package biz.kakee.utils;

import biz.kakee.pvo.geo.DMS;
import biz.kakee.pvo.geo.GeoLocation;
import biz.kakee.pvo.geo.Region;

public class GeoZoning {
    public static int FLOOR = 5;

    public static Region mapToRegion(final GeoLocation location) {
        Region region = new Region();
        region.setLatitude(zoning(convertDDToDMS(location.getLatitude())));
        region.setLongitude(zoning(convertDDToDMS(location.getLongitude())));
        return region;
    }

    /**
     * convert Decimal Degrees to Degrees, Minutes, Seconds
     *
     * @param dd
     * @return
     */
    public static DMS convertDDToDMS(double dd) {
        DMS dms = new DMS();

        // keep sign
        dms.setDegrees((int) dd);

        double fraction = Math.abs(dd) % 1;
        int minutes = (int) (fraction * 60D);
        dms.setMinutes(minutes);

        dms.setSeconds((int) (3600D * (fraction - (minutes / 60D))));
        return dms;
    }

    public static DMS zoning(DMS dms) {
        int seconds = dms.getSeconds();
        dms.setSeconds(seconds - seconds % FLOOR);
        return dms;
    }
}

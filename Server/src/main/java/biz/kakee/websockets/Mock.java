package biz.kakee.websockets;

import biz.kakee.pvo.ui.Marker;
import com.google.common.io.ByteStreams;

import java.io.ByteArrayOutputStream;
import java.net.URI;

public class Mock {
    public static void mock(String userId) throws Exception {

        String url = "http://images.dailytech.com/nimage/G_is_For_Google_New_Logo_Thumb.png";

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ByteStreams.copy(URI.create(url).toURL().openStream(), baos);

        Marker marker = new Marker();
        marker.setTitle("title 1");
        marker.setSnippet("\u2605 \u2605 \u2605 \u2606");
        marker.setLatitude(37.788474D);
        marker.setLongitude(-122.401780);
        marker.setIcon(baos.toByteArray());
        /*

        UserSocket.Message msg = new UserSocket.Message();
        msg.setChannel("chan1");
        msg.setTopic("marker");
        msg.setData(marker);

        UserSocket.sendMessageTo(userId, msg);
        */
    }
}

package biz.kakee.pvo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Menu {
    @Data
    public static class Item {
        private String name;
        private String quantity;
        private String price;
        private List<Item> subItems = new ArrayList<>();
    }

    private String version;
    private List<Item> items = new ArrayList<>();
}

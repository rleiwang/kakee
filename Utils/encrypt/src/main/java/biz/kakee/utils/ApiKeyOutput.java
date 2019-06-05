package biz.kakee.utils;

import biz.kakee.pvo.paypal.ApiKey;
import com.fasterxml.jackson.databind.ObjectMapper;

public class ApiKeyOutput {
    public static void main(String[] argv) throws Exception {
        ApiKey apiKey = new ApiKey(System.getProperty("clientId"), System.getProperty("secret"));
        new ObjectMapper().writeValue(System.out, apiKey);
    }
}

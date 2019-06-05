package biz.kakee.utils;

import biz.kakee.pvo.paypal.ApiKey;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.Console;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

public class Encrypt {
    public static void main(String[] argv) throws Exception {
        Console console = System.console();
        //ApiKey apiKey = new ApiKey();
        //apiKey.setClientId(new String(console.readPassword("Enter ClientId")));
        //apiKey.setSecret(new String(console.readPassword("Enter secret")));

        char[] password = console.readPassword("Enter password:");
        char[] password2 = console.readPassword("Enter password again:");
        if (isPasswdDiff(password, password2)) {
            System.out.println("password doesn't match");
            System.exit(1);
        }

        Path out = Paths.get("paypal_api.out");

        //byte[] data = new ObjectMapper().writeValueAsBytes(apiKey);
        byte[] data = Files.readAllBytes(Paths.get(argv[0]));
        new ObjectMapper().writeValue(out.toFile(), Crypto.encrypt(password, data));

        String newPss = Files.readAllLines(Paths.get(".password"), StandardCharsets.UTF_8).get(0);
        System.out.println(newPss);
       if (isPasswdDiff(password, newPss.toCharArray())) {
            System.out.println("password doesn't match");
            System.exit(1);
        }

        byte[] recvData = Crypto.decrypt(newPss.toCharArray(),
                new ObjectMapper().readValue(out.toFile(), Crypto.Message.class));

        if (data.length != recvData.length) {
            System.out.println("reading failed");
            System.exit(1);
        }
        for (int i = 0; i < data.length; i++) {
            if (data[i] != recvData[i]) {
                System.out.println("reading failed");
                System.exit(1);
            }
        }
        System.out.println("done");
    }

    private static boolean isPasswdDiff(char[] passwd1, char[] passwd2) {
        if (passwd1.length != passwd2.length) {
            return true;
        }

        for (int i = 0; i < passwd1.length; i++) {
            if (passwd1[i] != passwd2[i]) {
                return true;
            }
        }
        return false;
    }
}

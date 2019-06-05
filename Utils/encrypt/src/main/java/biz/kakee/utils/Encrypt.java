package biz.kakee.utils;

import com.beust.jcommander.JCommander;
import com.beust.jcommander.Parameter;

import java.io.Console;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;

public class Encrypt {
  private static class Options {
    @Parameter(names = "-out", description = "output", required = true)
    private String outF;

    @Parameter(names = "-in", description = "input", required = true)
    private String inF;
  }

  public static void main(String[] argv) throws Exception {
    Options options = new Options();
    new JCommander(options, argv);

    Console console = System.console();
    char[] password = console.readPassword("Enter password:");
    char[] password2 = console.readPassword("Enter password again:");
    if (isPasswdDiff(password, password2)) {
      System.out.println("password doesn't match");
      System.exit(1);
    }

    String newPss = Files.readAllLines(Paths.get(".password"), StandardCharsets.UTF_8).get(0);
    System.out.println(newPss);
    if (isPasswdDiff(password, newPss.toCharArray())) {
      System.out.println("password doesn't match");
      System.exit(1);
    }

    //byte[] data = new ObjectMapper().writeValueAsBytes(apiKey);
    //Path out = Paths.get(options.outF);
    byte[] input = Files.readAllBytes(Paths.get(options.inF));
    if (input[input.length - 1] == '\n') {
      input = Arrays.copyOf(input, input.length - 1);
    }
    Files.write(Paths.get(options.outF), Crypto.encryptWithPasswd(password, input).getBytes(StandardCharsets.UTF_8));

    byte[] output = Files.readAllBytes(Paths.get(options.outF));
    byte[] decripted = Crypto.decryptBytesWithPasswd(password, new String(output, StandardCharsets.UTF_8));

    if (input.length != decripted.length) {
      System.out.println("reading failed");
      System.exit(1);
    }
    for (int i = 0; i < input.length; i++) {
      if (input[i] != decripted[i]) {
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

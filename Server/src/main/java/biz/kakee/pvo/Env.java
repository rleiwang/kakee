package biz.kakee.pvo;

import java.nio.file.Files;
import java.nio.file.Paths;

public class Env {
  public static final boolean isProd =
      Files.exists(Paths.get(System.getProperty("user.home")).resolve(".kakee").resolve(".prod"));
}

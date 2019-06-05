package biz.kakee;

import biz.kakee.jmh.EmbeddedAeronBenchmark;
import org.openjdk.jmh.runner.Runner;
import org.openjdk.jmh.runner.options.Options;
import org.openjdk.jmh.runner.options.OptionsBuilder;

public class JmhMain {
    public static void main(String[] args) throws Exception {
        Options opt = new OptionsBuilder()
                .include(".*" + EmbeddedAeronBenchmark.class.getSimpleName() + ".*")
                .build();
        new Runner(opt).run();
    }
}

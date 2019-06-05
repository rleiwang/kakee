package biz.kakee;

import biz.kakee.aeron.EmbeddedAeron;
import biz.kakee.db.CassandraModule;
import biz.kakee.external.gcm.Notifier;
import biz.kakee.external.gmail.GmailService;
import biz.kakee.resources.DaggerRestComponents;
import biz.kakee.resources.PayPalResources;
import biz.kakee.resources.RestComponents;
import biz.kakee.resources.auth.AuthUser;
import biz.kakee.resources.auth.AuthUserProvider;
import biz.kakee.resources.auth.jwt.JwtServiceModule;
import biz.kakee.websockets.MetricRegistra;
import biz.kakee.websockets.OperatorEndPoint;
import biz.kakee.websockets.UserEndPoint;
import io.dropwizard.Application;
import io.dropwizard.setup.Bootstrap;
import io.dropwizard.setup.Environment;
import io.dropwizard.websockets.WebsocketBundle;
import org.apache.commons.lang3.StringUtils;
import org.glassfish.hk2.api.InjectionResolver;
import org.glassfish.hk2.api.TypeLiteral;
import org.glassfish.hk2.utilities.binding.AbstractBinder;
import org.glassfish.jersey.server.filter.RolesAllowedDynamicFeature;
import org.glassfish.jersey.server.spi.internal.ValueFactoryProvider;

import javax.inject.Singleton;
import java.io.Console;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;

public class Main extends Application<Conf> {

  @Override
  public void initialize(final Bootstrap<Conf> bootstrap) {
    super.initialize(bootstrap);
    bootstrap.addBundle(new WebsocketBundle(UserEndPoint.class, OperatorEndPoint.class));
  }

  @Override
  public void run(final Conf conf, final Environment env) throws Exception {
    MetricRegistra.setMetricRegistry(env.metrics());
    EmbeddedAeron.start(conf.getAeronConf());
    char[] passwd = readPassword();
    Conf.GoogleConf googleConf = conf.getGoogleConf();
    GmailService.start(googleConf.getGmail(), passwd);
    Notifier.start(googleConf.getGcm(), passwd);

    RestComponents restComponents = DaggerRestComponents.builder()
        .cassandraModule(new CassandraModule(conf, passwd))
        .jwtServiceModule(new JwtServiceModule(conf))
        .build();
    env.jersey().register(new PayPalResources());
    env.jersey().register(RolesAllowedDynamicFeature.class);
    env.jersey().register(restComponents.getAuthFeatures());
    env.jersey().register(new AbstractBinder() {
      @Override
      protected void configure() {
        bind(AuthUserProvider.class)
            .to(ValueFactoryProvider.class)
            .in(Singleton.class);
        bind(AuthUserProvider.InjectionResolver.class)
            .to(new TypeLiteral<InjectionResolver<AuthUser>>() {
            })
            .in(Singleton.class);
      }
    });
  }

  public static void main(final String[] args) throws Exception {
    new Main().run(args);
  }

  private char[] readPassword() throws Exception {
    String passwd = System.getenv("KAKEE_PASS");
    if (StringUtils.isNotEmpty(passwd)) {
      return passwd.toCharArray();
    }

    Console console = System.console();
    if (console == null) {
      byte[] data = Files.readAllBytes(Paths.get(".password"));
      int padding = 0;
      for (int last = data.length - 1; last >= 0; last--) {
        if (Character.isWhitespace(data[last])) {
          padding++;
        }
      }
      return new String(Arrays.copyOf(data, data.length - padding), StandardCharsets.UTF_8).toCharArray();
    }
    return console.readPassword("Please enter password:");
  }
}

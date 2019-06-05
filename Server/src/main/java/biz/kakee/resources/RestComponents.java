package biz.kakee.resources;


import biz.kakee.db.CassandraModule;
import biz.kakee.resources.auth.AuthFeatures;
import biz.kakee.resources.auth.jwt.JwtServiceModule;
import dagger.Component;

import javax.inject.Singleton;

@Singleton
@Component(modules = {CassandraModule.class, JwtServiceModule.class})
public interface RestComponents {
    AuthFeatures getAuthFeatures();
}

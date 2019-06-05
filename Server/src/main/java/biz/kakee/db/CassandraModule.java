package biz.kakee.db;

import biz.kakee.Conf;
import dagger.Module;
import dagger.Provides;

import javax.inject.Singleton;

@Module
public class CassandraModule {
    private final Cassandra cassandra;

    public CassandraModule(Conf conf, char[] passwd) {
        cassandra = new Cassandra(conf, passwd);
    }

    @Singleton
    @Provides
    public Cassandra providesCassandra() {
        return cassandra;
    }
}
#!/bin/sh

start_cassandra() {
  echo "starting start_cassandra"
  JAVA_HOME=`/usr/libexec/java_home -v 1.8`
  PATH=$JAVA_HOME/bin:$PATH
  bin/cassandra
  while [ `nc -z localhost 9042` ]
  do
    echo "waiting for cassandra"
    sleep 5
  done
}

# test port 9042
nc -z localhost 9042 || start_cassandra
echo "cassandra started"
ps aux | grep CassandraDaemon | grep -v grep | awk '{print $2}' > $1

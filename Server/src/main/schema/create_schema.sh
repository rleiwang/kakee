if [ -z $CASSANDRA_HOME ]; then
  CQLSH=cqlsh
else
  CQLSH=$CASSANDRA_HOME/bin/cqlsh
fi

for f in "keyspace.cql" "custom_types.cql" "account.cql" "billing.cql" "menu.cql"  "zones.cql"  "order.cql"  "paypal.cql"
do
  echo "$CQLSH -f $f cassandra-host"
  $CQLSH -f $f cassandra-host
done
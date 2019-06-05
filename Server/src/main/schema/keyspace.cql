DROP KEYSPACE IF EXISTS kakee;
CREATE KEYSPACE kakee
WITH REPLICATION = { 'class' : 'NetworkTopologyStrategy', 'us-west-2': 2};

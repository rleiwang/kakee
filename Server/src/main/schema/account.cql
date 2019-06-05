USE kakee;

CREATE TABLE passwords (
  operatorId TEXT,
  name TEXT,
  password TEXT,
  events LIST<FROZEN<event>>,
  PRIMARY KEY (operatorId)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE installations (
  iid TEXT,
  hash_code TEXT,
  ts TIMESTAMP,
  instance_id TEXT,
  device_id TEXT,
  manufacturer TEXT,
  model TEXT,
  brand TEXT,
  system_name TEXT,
  system_version TEXT,
  bundle_id TEXT,
  build_number TEXT,
  version TEXT,
  readable_version TEXT,
  device_name TEXT,
  user_agent TEXT,
  locale TEXT,
  country TEXT,
  PRIMARY KEY (iid, hash_code)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE CUSTOM INDEX installations_index ON installations ()
USING 'com.stratio.cassandra.lucene.Index'
WITH OPTIONS = {
    'directory_path' : '/mnt/cas/lucene/installation',
    'refresh_seconds' : '30',
    'schema' : '{
        fields : {
            ts  : {type : "date"},
            bundle_id  : {type : "string"},
            build_number  : {type : "string"},
            version  : {type : "string"},
            manufacturer  : {type : "string"},
            model  : {type : "string"},
            brand  : {type : "string"},
            system_name  : {type : "string"},
            system_version  : {type : "string"}
        }
    }'
};

CREATE TABLE referrals (
  userId TEXT,
  refId TIMEUUID,
  code TEXT,
  userEmail TEXT,
  userPhone TEXT,
  operatorEmail TEXT,
  PRIMARY KEY (userId, refId, code)
) WITH CLUSTERING ORDER BY (refId DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE MATERIALIZED VIEW IF NOT EXISTS invitations AS
  SELECT userEmail
  FROM referrals
  WHERE operatorEmail IS NOT NULL
  AND code IS NOT NULL
  AND refId IS NOT NULL
  AND userId IS NOT NULL
  PRIMARY KEY(operatorEmail, code, refId, userId)
WITH CLUSTERING ORDER BY (code DESC, refId DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE emails (
  email TEXT,
  refId TIMEUUID,
  userId TEXT,
  threadId TEXT,
  bounced BOOLEAN,
  PRIMARY KEY (email, refId, userId)
) WITH CLUSTERING ORDER BY (refId DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE MATERIALIZED VIEW IF NOT EXISTS email_threads AS
  SELECT threadId, email, refId, userId
  FROM emails
  WHERE threadId IS NOT NULL
  AND email IS NOT NULL
  AND refId IS NOT NULL
  AND userId IS NOT NULL
  PRIMARY KEY(threadId, email, refId, userId)
WITH CLUSTERING ORDER BY (code DESC, refId DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE profiles (
  operatorId TEXT,
  version TIMEUUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  category TEXT,
  ccp TEXT,
  priceRange TEXT,
  description TEXT,
  city TEXT,
  photo TEXT,
  website TEXT,
  twitter TEXT,
  facebook TEXT,
  PRIMARY KEY (operatorId, version)
) WITH CLUSTERING ORDER BY (version DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE verification (
  installID TEXT,
  email TEXT,
  expiry TIMESTAMP,
  code TEXT,
  PRIMARY KEY (installID, email, expiry)
) WITH CLUSTERING ORDER BY (email DESC, expiry DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

USE kakee;

CREATE TABLE sessions (
  mid TEXT,
  tmline TIMEUUID,
  role TEXT,
  activity TEXT,
  latitude FLOAT,
  longitude FLOAT,
  remote TEXT,
  channel TEXT,
  streamId INT,
  socketId TEXT,
  iid TEXT,
  body TEXT,
  PRIMARY KEY (mid, tmline)
) WITH CLUSTERING ORDER BY (tmline DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE CUSTOM INDEX sessions_index ON sessions ()
USING 'com.stratio.cassandra.lucene.Index'
WITH OPTIONS = {
    'directory_path' : '/mnt/cas/lucene/sessions',
    'refresh_seconds' : '1',
    'schema' : '{
        fields : {
            role : {type : "string"},
            activity : {type : "string"},
            place : {type : "geo_point", latitude:"latitude", longitude:"longitude"}
        }
    }'
};

// deviceId, 'device', memberId
// memberId, 'acct', deviceId
CREATE TABLE login_devices (
  iid TEXT,
  type TEXT,
  mid TEXT,
  PRIMARY KEY ((iid, type), mid)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE gcm_tokens (
  mid TEXT,
  platform TEXT,
  reg_token TEXT,
  PRIMARY KEY (mid)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE online_members (
  mid TEXT,
  ts TIMESTAMP,
  role TEXT,
  isOpen BOOLEAN,
  channel TEXT,
  streamId INT,
  latitude FLOAT,
  longitude FLOAT,
  paypal TEXT,
  square TEXT,
  chat TEXT,
  city TEXT,
  taxRate FLOAT,
  pending INT,
  PRIMARY KEY (mid)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE CUSTOM INDEX online_members_index ON online_members ()
USING 'com.stratio.cassandra.lucene.Index'
WITH OPTIONS = {
    'directory_path' : '/mnt/cas/lucene/online_members',
    'refresh_seconds' : '1',
    'schema' : '{
        fields : {
            isopen  : {type : "boolean"},
            role  : {type : "string"},
            place : {type : "geo_point", latitude:"latitude", longitude:"longitude"}
        }
    }'
};

CREATE TABLE offline_messages (
  mid TEXT,
  msgId TIMEUUID,
  topic TEXT,
  expiry BIGINT,
  msg TEXT,
  sent BOOLEAN,
  PRIMARY KEY (mid, msgId)
) WITH CLUSTERING ORDER BY (msgId ASC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE INDEX IF NOT EXISTS offline_messages_index ON offline_messages (sent);

CREATE TABLE dialogues (
  msgId TIMEUUID,
  senderId TEXT,
  recipientId TEXT,
  msg TEXT,
  PRIMARY KEY (msgId)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE conversations (
  mid TEXT,
  remoteId TEXT,
  msgId TIMEUUID,
  self BOOLEAN,
  PRIMARY KEY ((mid, remoteId), msgId)
) WITH CLUSTERING ORDER BY (msgId DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE conversation_bookmark (
  mid TEXT,
  remoteId TEXT,
  last_read TIMEUUID,
  last_msg TIMEUUID,
  PRIMARY KEY (mid, remoteId)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE customer_preferences (
  customerId TEXT,
  favorites SET<TEXT>,
  tryouts SET<TEXT>,
  PRIMARY KEY (customerId)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE city_bounds (
  postal_code TEXT,
  city TEXT,
  state TEXT,
  ne_lat DOUBLE,
  ne_lng DOUBLE,
  sw_lat DOUBLE,
  sw_lng DOUBLE,
  PRIMARY KEY (postal_code, city, state)
);

CREATE CUSTOM INDEX city_bounds_index on city_bounds()
USING 'com.stratio.cassandra.lucene.Index'
WITH OPTIONS = {
   'directory_path' : '/mnt/cas/lucene/city_bounds',
   'refresh_seconds': '1',
   'schema': '{
      fields: {
         ne_lat: {type: "bigdec", integer_digits: 3, decimal_digits: 7, validated: true, column: "ne_lat"},
         ne_lng: {type: "bigdec", integer_digits: 3, decimal_digits: 7, validated: true, column: "ne_lng"},
         sw_lat: {type: "bigdec", integer_digits: 3, decimal_digits: 7, validated: true, column: "sw_lat"},
         sw_lng: {type: "bigdec", integer_digits: 3, decimal_digits: 7, validated: true, column: "sw_lng"}
      }
   }'
};

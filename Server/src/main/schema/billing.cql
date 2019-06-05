USE kakee;

CREATE TABLE monthly_billable (
  monthly TEXT,
  operatorId TEXT,
  PRIMARY KEY (monthly, operatorId)
) WITH CLUSTERING ORDER BY (operatorId DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':30};

CREATE TABLE accounts (
  operatorId TEXT,
  ts TIMEUUID,
  email TEXT,
  promotion_code TEXT,
  iid TEXT,
  free INT,
  grace INT,
  tzOffset INT,
  latitude FLOAT,
  longitude FLOAT,
  PRIMARY KEY (operatorId, ts)
) WITH CLUSTERING ORDER BY (ts DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE CUSTOM INDEX accounts_index ON accounts ()
USING 'com.stratio.cassandra.lucene.Index'
WITH OPTIONS = {
    'directory_path' : '/mnt/cas/lucene/accounts',
    'refresh_seconds' : '1',
    'schema' : '{
        fields : {
            promotion_code  : {type : "string"},
            place : {type : "geo_point", latitude:"latitude", longitude:"longitude"}
        }
    }'
};

CREATE MATERIALIZED VIEW IF NOT EXISTS signup_devices AS
  SELECT iid, operatorId, ts
  FROM accounts
  WHERE operatorId IS NOT NULL
  AND iid IS NOT NULL
  AND ts IS NOT NULL
  PRIMARY KEY(iid, operatorId, ts)
WITH COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE MATERIALIZED VIEW IF NOT EXISTS signup_emails AS
  SELECT promotion_code
  FROM accounts
  WHERE operatorId IS NOT NULL
  AND email IS NOT NULL
  AND ts IS NOT NULL
  PRIMARY KEY(email, operatorId, ts)
WITH COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE bills (
  operatorId TEXT,
  end TIMEUUID,
  start TIMEUUID,
  invoice TEXT,
  sales DOUBLE,
  commission DOUBLE,
  ads DOUBLE,
  unpaid BOOLEAN,
  grace INT,
  paid TIMESTAMP,
  method TEXT,
  btTxId TEXT,
  payerEmail TEXT,
  payerId TEXT,
  payerFirstName TEXT,
  payerLastName TEXT,
  paymentId TEXT,
  authId TEXT,
  PRIMARY KEY (operatorId, end, start, invoice)
) WITH CLUSTERING ORDER BY (end DESC, start DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE MATERIALIZED VIEW IF NOT EXISTS unpaid_bills AS
  SELECT grace, sales, ads, commission
  FROM bills
  WHERE operatorId IS NOT NULL
  AND end IS NOT NULL
  AND start IS NOT NULL
  AND invoice IS NOT NULL
  AND unpaid IS NOT NULL
  PRIMARY KEY(operatorId, end, start, unpaid, invoice)
WITH COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE MATERIALIZED VIEW IF NOT EXISTS invoices AS
  SELECT operatorId
  FROM bills
  WHERE invoice IS NOT NULL
  AND operatorId IS NOT NULL
  AND end IS NOT NULL
  AND start IS NOT NULL
  PRIMARY KEY(invoice, end, start, operatorId)
WITH CLUSTERING ORDER BY (payerEmail DESC, end DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

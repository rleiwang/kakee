USE kakee;

CREATE TABLE orders (
  orderId TIMEUUID,
  operatorId TEXT,
  customerId TEXT,
  orderNum INT,
  type TEXT,
  city TEXT,
  is_open BOOLEAN,
  status TEXT,
  customerLatitude FLOAT,
  customerLongitude FLOAT,
  operatorLatitude FLOAT,
  operatorLongitude FLOAT,
  notes TEXT,
  subTotal FLOAT,
  discount FLOAT,
  taxRate FLOAT,
  tax FLOAT,
  total FLOAT,
  payments TEXT,
  pickupTime LONG,
  promoCode TEXT,
  specialOffer FLOAT,
  specialOfferVersion TEXT,
  menuVersion TEXT,
  menuItems TEXT,
  events LIST<FROZEN<event>>,
  PRIMARY KEY (orderId, operatorId, customerId)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE CUSTOM INDEX orders_index ON orders ()
USING 'com.stratio.cassandra.lucene.Index'
WITH OPTIONS = {
    'directory_path' : '/mnt/cas/lucene/orders',
    'refresh_seconds' : '1',
    'schema' : '{
        fields : {
            status  : {type : "string"},
            op_loc : {type : "geo_point", latitude: "operatorlatitude", longitude: "operatorlongitude"},
            cs_loc : {type : "geo_point", latitude: "customerlatitude", longitude: "customerlongitude"}
        }
    }'
};

// query for customer last N orders in desc
CREATE MATERIALIZED VIEW IF NOT EXISTS customer_orders AS
  SELECT customerId, orderId, operatorId
  FROM orders
  WHERE customerId IS NOT NULL
  AND orderId IS NOT NULL
  AND operatorId IS NOT NULL
  PRIMARY KEY(customerId, orderId, operatorId)
WITH CLUSTERING ORDER BY (orderId DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

// query for operator last N orders in desc
CREATE MATERIALIZED VIEW IF NOT EXISTS operator_orders AS
  SELECT status
  FROM orders
  WHERE customerId IS NOT NULL
  AND orderId IS NOT NULL
  AND operatorId IS NOT NULL
  PRIMARY KEY(operatorId, orderId, customerId)
WITH CLUSTERING ORDER BY (orderId DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

// operator/customer last N orders in desc
CREATE MATERIALIZED VIEW IF NOT EXISTS pair_orders AS
  SELECT operatorId, customerId, orderId
  FROM orders
  WHERE customerId IS NOT NULL
  AND orderId IS NOT NULL
  AND operatorId IS NOT NULL
  PRIMARY KEY((operatorId, customerId), orderId)
WITH CLUSTERING ORDER BY (orderId desc) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

// closed/received should be the same as in OrderStatus
CREATE TABLE pair_order_counters (
  operatorId TEXT,
  customerId TEXT,
  open COUNTER,
  ready COUNTER,
  closed COUNTER,
  canceled COUNTER,
  PRIMARY KEY ((operatorId, customerId))
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE site_orders (
  operatorId TEXT,
  orderId TIMEUUID,
  PRIMARY KEY (operatorId, orderId)
) WITH CLUSTERING ORDER BY (orderId DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE MATERIALIZED VIEW IF NOT EXISTS open_orders AS
  SELECT orderNum, city, status, notes, subTotal, taxRate, tax, total, promoCode, discount, payments,
         menuVersion, menuItems, pickupTime
  FROM orders
  WHERE customerId IS NOT NULL
  AND orderId IS NOT NULL
  AND operatorId IS NOT NULL
  AND is_open IS NOT NULL
  PRIMARY KEY(customerId, operatorId, orderId, is_open)
WITH CLUSTERING ORDER BY (operatorId DESC, orderId DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

// can't use camel case with lucene index
CREATE TABLE special_offers (
  operatorId TEXT,
  version TIMEUUID,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  discount FLOAT,
  promo_code TEXT,
  notes TEXT,
  type TEXT,
  PRIMARY KEY (operatorId, version)
) WITH CLUSTERING ORDER BY (version DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE CUSTOM INDEX special_offers_index ON special_offers ()
USING 'com.stratio.cassandra.lucene.Index'
WITH OPTIONS = {
    'directory_path' : '/mnt/cas/lucene/special_offers',
    'refresh_seconds' : '1',
    'schema' : '{
        fields : {
            start_date : {type : "date"},
            end_date : {type: "date"},
            promo_code : {type : "string"}
        }
    }'
};

CREATE TABLE special_offers_history (
  operatorId TEXT,
  version TIMEUUID,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  discount FLOAT,
  promo_code TEXT,
  notes TEXT,
  type TEXT,
  deleted TIMESTAMP,
  PRIMARY KEY (operatorId, version)
) WITH CLUSTERING ORDER BY (version DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

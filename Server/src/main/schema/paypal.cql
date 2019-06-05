USE kakee;

CREATE TABLE paypal_customer_info (
  operatorId TEXT,
  customerId TEXT,
  uid TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  PRIMARY KEY ((operatorId, customerId), uid)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE paypal_tx_info (
  txId TEXT,
  orderId TEXT,
  operatorId TEXT,
  invId TEXT,
  uid TEXT,
  customerId TEXT,
  correlationId TEXT,
  authId TEXT,
  authCode TEXT,
  receiptToken TEXT,
  handle TEXT,
  status TEXT,
  PRIMARY KEY (txId, orderId, operatorId)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE square_tx_info (
  txId TEXT,
  orderId TEXT,
  operatorId TEXT,
  uid TEXT,
  clientTxId TEXT,
  PRIMARY KEY (txId, orderId, operatorId)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE square_offline_tx_info (
  clientTxId TEXT,
  orderId TEXT,
  operatorId TEXT,
  uid TEXT,
  PRIMARY KEY (clientTxId, orderId)
) WITH
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

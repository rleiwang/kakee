USE kakee;

CREATE TABLE menus (
  operatorId TEXT,
  version TIMEUUID,
  menu TEXT,
  PRIMARY KEY (operatorId, version)
) WITH CLUSTERING ORDER BY (version DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE announcements (
  operatorId TEXT,
  msgId TIMEUUID,
  msg TEXT,
  PRIMARY KEY (operatorId, msgId)
) WITH CLUSTERING ORDER BY (msgId DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

CREATE TABLE announcements_history (
  operatorId TEXT,
  msgId TIMEUUID,
  msg TEXT,
  deleted TIMESTAMP,
  PRIMARY KEY (operatorId, msgId)
) WITH CLUSTERING ORDER BY (msgId DESC) AND
COMPACTION = {'class':'TimeWindowCompactionStrategy', 'compaction_window_unit':'DAYS', 'compaction_window_size':1};

USE kakee;

CREATE TYPE dms (
    degrees int,
    minutes int,
    seconds int
);

CREATE TYPE region (
    latitude frozen<dms>,
    longitude frozen<dms>
);

CREATE TYPE geolocation (
    latitude float,
    longitude float
);

CREATE TYPE coordinate (
    location frozen<geolocation>,
    unixTime bigint
);

CREATE TYPE event (
    type TEXT,
    msg  TEXT,
    ts   TIMESTAMP
);

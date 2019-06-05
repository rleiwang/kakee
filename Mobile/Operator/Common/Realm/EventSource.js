'use strict';

import Realm from './RealmSingleton';
import Sequence from './Sequence';

class EventSource {
}

EventSource.append = function (act, src, evt) {
    Realm.write(() => {
        let seqs = realm.objects(Sequence.schema.name).filtered('seqTypeId = 0');
        let sid = seqs.length == 0 ? 0 : seqs[0];
        Realm.create(Sequence.schema.name, {
            seqTypeId: 0,
            nextId: sid + 1
        }, true);
        Realm.create(EventSource.schema.name, {
            seqId: sid,
            timestamp: Date.now(),
            action: act,
            source: src,
            event: evt
        });
    });
};

EventSource.schema = {
    name: 'EventSource',
    primaryKey: 'seqId',
    properties: {
        seqId: 'int',
        timestamp: 'double',
        action: 'string',
        source: 'string',
        event: 'string'
    }
};

module.exports = EventSource;

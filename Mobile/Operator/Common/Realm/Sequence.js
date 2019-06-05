'use strict';

class Sequence {
}

Sequence.schema = {
    name: 'Sequence',
    primaryKey: 'seqTypeId',
    properties: {
        seqTypeId: 'int',
        nextId: 'int'
    }
};

module.exports = Sequence;
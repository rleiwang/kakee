'use strict';

import Realm from './Realm/RealmSingleton';
import GeoLocation from 'shared-modules/GeoLocation';

GeoLocation.initRealm(Realm);
export default GeoLocation;

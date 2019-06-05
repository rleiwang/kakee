#import "RCTEventDispatcher.h"

#import "Central.h"

static NSString *EVENT_NAME = @"BLUETOOTH_CENTRAL";

@implementation BluetoothCentral

- (id) init
{
  self = [super init];
  if (self)
  {
    _bluetooth_thread = dispatch_queue_create("biz.kakee.bluetooth", DISPATCH_QUEUE_SERIAL);
    _centralManager = [[CBCentralManager alloc] initWithDelegate:self queue:_bluetooth_thread];
    
    _discoveredPeripherals = [[NSMutableDictionary alloc] init];
    _connectedPeripherals = [[NSMutableDictionary alloc] init];
    _readyCharacteristics = [[NSMutableDictionary alloc] init];
    _writeCallBacks = [[NSMutableDictionary alloc] init];
  }
  
  return self;
}

@synthesize bridge = _bridge;

#pragma mark - CBCentralManagerDelegate

/*!
 *  @method centralManagerDidUpdateState:
 *
 *  @param central  The central manager whose state has changed.
 *
 *  @discussion     Invoked whenever the central manager's state has been updated. Commands should only be issued when the state is
 *                  <code>CBCentralManagerStatePoweredOn</code>. A state below <code>CBCentralManagerStatePoweredOn</code>
 *                  implies that scanning has stopped and any connected peripherals have been disconnected. If the state moves below
 *                  <code>CBCentralManagerStatePoweredOff</code>, all <code>CBPeripheral</code> objects obtained from this central
 *                  manager become invalid and must be retrieved or discovered again.
 *
 *  @see            state
 *
 */
- (void)centralManagerDidUpdateState:(CBCentralManager *)central
{
  [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                           body:@{@"type": @"state",
                                                  @"state": [self toStateString:central]}];
}

- (NSString *) toStateString:(CBCentralManager *)central
{
  switch(central.state) {
    case CBCentralManagerStateUnknown:
      return @"unknown";
    case CBCentralManagerStateResetting:
      return @"reset";
    case CBCentralManagerStateUnsupported:
      return @"unsupported";
    case CBCentralManagerStateUnauthorized:
      return @"unauthorized";
    case CBCentralManagerStatePoweredOff:
      return @"off";
    case CBCentralManagerStatePoweredOn:
      return @"on";
  }
}

/*!
 *  @method centralManager:willRestoreState:
 *
 *  @param central      The central manager providing this information.
 *  @param dict			A dictionary containing information about <i>central</i> that was preserved by the system at the time the app was terminated.
 *
 *  @discussion			For apps that opt-in to state preservation and restoration, this is the first method invoked when your app is relaunched into
 *						the background to complete some Bluetooth-related task. Use this method to synchronize your app's state with the state of the
 *						Bluetooth system.
 *
 *  @seealso            CBCentralManagerRestoredStatePeripheralsKey;
 *  @seealso            CBCentralManagerRestoredStateScanServicesKey;
 *  @seealso            CBCentralManagerRestoredStateScanOptionsKey;
 *
 */
- (void)centralManager:(CBCentralManager *)central willRestoreState:(NSDictionary<NSString *, id> *)dict
{
  NSLog(@"willRestoreState %@", dict);
}

/*!
 *  @method centralManager:didDiscoverPeripheral:advertisementData:RSSI:
 *
 *  @param central              The central manager providing this update.
 *  @param peripheral           A <code>CBPeripheral</code> object.
 *  @param advertisementData    A dictionary containing any advertisement and scan response data.
 *  @param RSSI                 The current RSSI of <i>peripheral</i>, in dBm. A value of <code>127</code> is reserved and indicates the RSSI
 *								was not available.
 *
 *  @discussion                 This method is invoked while scanning, upon the discovery of <i>peripheral</i> by <i>central</i>. A discovered peripheral must
 *                              be retained in order to use it; otherwise, it is assumed to not be of interest and will be cleaned up by the central manager. For
 *                              a list of <i>advertisementData</i> keys, see {@link CBAdvertisementDataLocalNameKey} and other similar constants.
 *
 *  @seealso                    CBAdvertisementData.h
 *
 */
- (void)centralManager:(CBCentralManager *)central didDiscoverPeripheral:(CBPeripheral *)peripheral advertisementData:(NSDictionary<NSString *, id> *)advertisementData RSSI:(NSNumber *)RSSI
{
  NSLog(@"Discovered %@ at %@", peripheral.name, RSSI);
  
  if (![_discoveredPeripherals objectForKey:peripheral]) {
    // Save a local copy of the peripheral, so CoreBluetooth doesn't get rid of it
    [_discoveredPeripherals setObject:[[NSMutableData alloc] init] forKey:peripheral];
    
    // And connect
    NSLog(@"Connecting to peripheral %@", peripheral);
    [_centralManager connectPeripheral:peripheral options:nil];
  }
}

/*!
 *  @method centralManager:didConnectPeripheral:
 *
 *  @param central      The central manager providing this information.
 *  @param peripheral   The <code>CBPeripheral</code> that has connected.
 *
 *  @discussion         This method is invoked when a connection initiated by {@link connectPeripheral:options:} has succeeded.
 *
 */
- (void)centralManager:(CBCentralManager *)central didConnectPeripheral:(CBPeripheral *)peripheral
{
  [_centralManager stopScan];
  
  [_connectedPeripherals setObject:peripheral forKey:peripheral.identifier];
  [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                           body:@{@"type": @"connected",
                                                  @"id": [peripheral.identifier UUIDString],
                                                  @"name": peripheral.name}];
  
  peripheral.delegate = self;
  [peripheral discoverServices:@[[CBUUID UUIDWithString:_serviceId]]];
}

/*!
 *  @method centralManager:didFailToConnectPeripheral:error:
 *
 *  @param central      The central manager providing this information.
 *  @param peripheral   The <code>CBPeripheral</code> that has failed to connect.
 *  @param error        The cause of the failure.
 *
 *  @discussion         This method is invoked when a connection initiated by {@link connectPeripheral:options:} has failed to complete. As connection attempts do not
 *                      timeout, the failure of a connection is atypical and usually indicative of a transient issue.
 *
 */
- (void)centralManager:(CBCentralManager *)central didFailToConnectPeripheral:(CBPeripheral *)peripheral error:(nullable NSError *)error
{
  [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                           body:@{@"type": @"error",
                                                  @"id": [peripheral.identifier UUIDString],
                                                  @"name": peripheral.name,
                                                  @"error": error}];
  [self cleanup:peripheral];
}

/*!
 *  @method centralManager:didDisconnectPeripheral:error:
 *
 *  @param central      The central manager providing this information.
 *  @param peripheral   The <code>CBPeripheral</code> that has disconnected.
 *  @param error        If an error occurred, the cause of the failure.
 *
 *  @discussion         This method is invoked upon the disconnection of a peripheral that was connected by {@link connectPeripheral:options:}. If the disconnection
 *                      was not initiated by {@link cancelPeripheralConnection}, the cause will be detailed in the <i>error</i> parameter. Once this method has been
 *                      called, no more methods will be invoked on <i>peripheral</i>'s <code>CBPeripheralDelegate</code>.
 *
 */
- (void)centralManager:(CBCentralManager *)central didDisconnectPeripheral:(CBPeripheral *)peripheral error:(nullable NSError *)error
{
  [self cleanup:peripheral];
  
  [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                           body:@{@"type": @"disconnected",
                                                  @"id": [peripheral.identifier UUIDString],
                                                  @"name": peripheral.name,
                                                  @"error": error}];
}


#pragma mark - CBPeripheralDelegate


/*!
 *  @method peripheralDidUpdateName:
 *
 *  @param peripheral	The peripheral providing this update.
 *
 *  @discussion			This method is invoked when the @link name @/link of <i>peripheral</i> changes.
 */
- (void)peripheralDidUpdateName:(CBPeripheral *)peripheral
{
  [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                           body:@{@"type": @"info",
                                                  @"id": [peripheral.identifier UUIDString],
                                                  @"name": peripheral.name}];
}

/*!
 *  @method peripheral:didModifyServices:
 *
 *  @param peripheral			The peripheral providing this update.
 *  @param invalidatedServices	The services that have been invalidated
 *
 *  @discussion			This method is invoked when the @link services @/link of <i>peripheral</i> have been changed.
 *						At this point, the designated <code>CBService</code> objects have been invalidated.
 *						Services can be re-discovered via @link discoverServices: @/link.
 */
- (void)peripheral:(CBPeripheral *)peripheral didModifyServices:(NSArray<CBService *> *)invalidatedServices
{
  // called before disconnect
}

/*!
 *  @method peripheral:didReadRSSI:error:
 *
 *  @param peripheral	The peripheral providing this update.
 *  @param RSSI			The current RSSI of the link.
 *  @param error		If an error occurred, the cause of the failure.
 *
 *  @discussion			This method returns the result of a @link readRSSI: @/link call.
 */
- (void)peripheral:(CBPeripheral *)peripheral didReadRSSI:(NSNumber *)RSSI error:(nullable NSError *)error
{
  if (!error && RSSI.intValue != 127) {
    [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                             body:@{@"type": @"rssi",
                                                    @"id": [peripheral.identifier UUIDString],
                                                    @"name": peripheral.name,
                                                    @"value": RSSI}];
  }
}

/*!
 *  @method peripheral:didDiscoverServices:
 *
 *  @param peripheral	The peripheral providing this information.
 *	@param error		If an error occurred, the cause of the failure.
 *
 *  @discussion			This method returns the result of a @link discoverServices: @/link call. If the service(s) were read successfully, they can be retrieved via
 *						<i>peripheral</i>'s @link services @/link property.
 *
 */
- (void)peripheral:(CBPeripheral *)peripheral didDiscoverServices:(nullable NSError *)error
{
  if (error) {
    [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                             body:@{@"type": @"error",
                                                    @"id": [peripheral.identifier UUIDString],
                                                    @"name": peripheral.name,
                                                    @"error": error}];
    [self cleanup:peripheral];
  } else {
    for (CBService *service in peripheral.services) {
      [peripheral discoverCharacteristics:@[[CBUUID UUIDWithString:_characteristicId]] forService:service];
    }
  }
}

/*!
 *  @method peripheral:didDiscoverIncludedServicesForService:error:
 *
 *  @param peripheral	The peripheral providing this information.
 *  @param service		The <code>CBService</code> object containing the included services.
 *	@param error		If an error occurred, the cause of the failure.
 *
 *  @discussion			This method returns the result of a @link discoverIncludedServices:forService: @/link call. If the included service(s) were read successfully,
 *						they can be retrieved via <i>service</i>'s <code>includedServices</code> property.
 */
- (void)peripheral:(CBPeripheral *)peripheral didDiscoverIncludedServicesForService:(CBService *)service error:(nullable NSError *)error
{
  NSLog(@"willRestoreState");
}

/*!
 *  @method peripheral:didDiscoverCharacteristicsForService:error:
 *
 *  @param peripheral	The peripheral providing this information.
 *  @param service		The <code>CBService</code> object containing the characteristic(s).
 *	@param error		If an error occurred, the cause of the failure.
 *
 *  @discussion			This method returns the result of a @link discoverCharacteristics:forService: @/link call. If the characteristic(s) were read successfully,
 *						they can be retrieved via <i>service</i>'s <code>characteristics</code> property.
 */
- (void)peripheral:(CBPeripheral *)peripheral didDiscoverCharacteristicsForService:(CBService *)service error:(nullable NSError *)error
{
  if (error) {
    [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                             body:@{@"type": @"error",
                                                    @"id": [peripheral.identifier UUIDString],
                                                    @"name": peripheral.name,
                                                    @"error": error}];
    [self cleanup:peripheral];
  } else {
    for (CBCharacteristic *characteristic in service.characteristics) {
      if ([characteristic.UUID isEqual:[CBUUID UUIDWithString:_characteristicId]]) {
        [peripheral setNotifyValue:YES forCharacteristic:characteristic];
      }
    }
  }
}

/*!
 *  @method peripheral:didUpdateValueForCharacteristic:error:
 *
 *  @param peripheral		The peripheral providing this information.
 *  @param characteristic	A <code>CBCharacteristic</code> object.
 *	@param error			If an error occurred, the cause of the failure.
 *
 *  @discussion				This method is invoked after a @link readValueForCharacteristic: @/link call, or upon receipt of a notification/indication.
 */
- (void)peripheral:(CBPeripheral *)peripheral didUpdateValueForCharacteristic:(CBCharacteristic *)characteristic error:(nullable NSError *)error
{
  if (error) {
    [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                             body:@{@"type": @"error",
                                                    @"id": [peripheral.identifier UUIDString],
                                                    @"name": peripheral.name,
                                                    @"error": error}];
  } else {
    NSMutableData *recvBuf = [_discoveredPeripherals objectForKey:peripheral];
    if (characteristic.value.length > 0) {
      [recvBuf appendData:characteristic.value];
    } else {
      // empty data buffer
      NSString *recvMsg = [[NSString alloc] initWithData:recvBuf encoding:NSUTF8StringEncoding];
      [recvBuf setLength:0];
      [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                               body:@{@"type": @"msg",
                                                      @"id": [peripheral.identifier UUIDString],
                                                      @"name": peripheral.name,
                                                      @"value": recvMsg}];
    }
  }
}

/*!
 *  @method peripheral:didWriteValueForCharacteristic:error:
 *
 *  @param peripheral		The peripheral providing this information.
 *  @param characteristic	A <code>CBCharacteristic</code> object.
 *	@param error			If an error occurred, the cause of the failure.
 *
 *  @discussion				This method returns the result of a {@link writeValue:forCharacteristic:type:} call, when the <code>CBCharacteristicWriteWithResponse</code> type is used.
 */
- (void)peripheral:(CBPeripheral *)peripheral didWriteValueForCharacteristic:(CBCharacteristic *)characteristic error:(nullable NSError *)error
{
  WriteCallBack cb = [_writeCallBacks objectForKey:peripheral];
  if (cb) {
    [_writeCallBacks removeObjectForKey:peripheral];
    cb(error);
  }
}

/*!
 *  @method peripheral:didUpdateNotificationStateForCharacteristic:error:
 *
 *  @param peripheral		The peripheral providing this information.
 *  @param characteristic	A <code>CBCharacteristic</code> object.
 *	@param error			If an error occurred, the cause of the failure.
 *
 *  @discussion				This method returns the result of a @link setNotifyValue:forCharacteristic: @/link call.
 */
- (void)peripheral:(CBPeripheral *)peripheral didUpdateNotificationStateForCharacteristic:(CBCharacteristic *)characteristic error:(nullable NSError *)error
{
  [[_discoveredPeripherals objectForKey:peripheral] setLength:0];
  if (error) {
    [_readyCharacteristics removeObjectForKey:peripheral];
    [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                             body:@{@"type": @"error",
                                                    @"id": [peripheral.identifier UUIDString],
                                                    @"name": peripheral.name,
                                                    @"error": error}];
  } else {
    [_readyCharacteristics setObject:characteristic forKey:peripheral];
    [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                             body:@{@"type": @"ready",
                                                    @"id": [peripheral.identifier UUIDString],
                                                    @"name": peripheral.name,
                                                    @"isNew": [NSNumber numberWithBool:characteristic.isNotifying]}];
  }
}

/*!
 *  @method peripheral:didDiscoverDescriptorsForCharacteristic:error:
 *
 *  @param peripheral		The peripheral providing this information.
 *  @param characteristic	A <code>CBCharacteristic</code> object.
 *	@param error			If an error occurred, the cause of the failure.
 *
 *  @discussion				This method returns the result of a @link discoverDescriptorsForCharacteristic: @/link call. If the descriptors were read successfully,
 *							they can be retrieved via <i>characteristic</i>'s <code>descriptors</code> property.
 */
- (void)peripheral:(CBPeripheral *)peripheral didDiscoverDescriptorsForCharacteristic:(CBCharacteristic *)characteristic error:(nullable NSError *)error
{
  NSLog(@"willRestoreState");
  
}

/*!
 *  @method peripheral:didUpdateValueForDescriptor:error:
 *
 *  @param peripheral		The peripheral providing this information.
 *  @param descriptor		A <code>CBDescriptor</code> object.
 *	@param error			If an error occurred, the cause of the failure.
 *
 *  @discussion				This method returns the result of a @link readValueForDescriptor: @/link call.
 */
- (void)peripheral:(CBPeripheral *)peripheral didUpdateValueForDescriptor:(CBDescriptor *)descriptor error:(nullable NSError *)error
{
  NSLog(@"willRestoreState");
  
}

/*!
 *  @method peripheral:didWriteValueForDescriptor:error:
 *
 *  @param peripheral		The peripheral providing this information.
 *  @param descriptor		A <code>CBDescriptor</code> object.
 *	@param error			If an error occurred, the cause of the failure.
 *
 *  @discussion				This method returns the result of a @link writeValue:forDescriptor: @/link call.
 */
- (void)peripheral:(CBPeripheral *)peripheral didWriteValueForDescriptor:(CBDescriptor *)descriptor error:(nullable NSError *)error
{
}

- (void) cleanup:(CBPeripheral *)peripheral
{
  [_discoveredPeripherals removeObjectForKey:peripheral];
  [_readyCharacteristics removeObjectForKey:peripheral];
  [_connectedPeripherals removeObjectForKey:peripheral.identifier];
  
  // See if we are subscribed to a characteristic on the peripheral
  if (peripheral.services != nil) {
    for (CBService *service in peripheral.services) {
      if (service.characteristics != nil) {
        for (CBCharacteristic *characteristic in service.characteristics) {
          if ([characteristic.UUID isEqual:[CBUUID UUIDWithString:_characteristicId]]) {
            if (characteristic.isNotifying) {
              [peripheral setNotifyValue:NO forCharacteristic:characteristic];
              return;
            }
          }
        }
      }
    }
  }
  
  [_centralManager cancelPeripheralConnection:peripheral];
}

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(scan:(NSString *)serviceId :(NSString *)characteristicId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  _serviceId = serviceId;
  _characteristicId = characteristicId;
  
  // Scan for devices
  [_centralManager scanForPeripheralsWithServices:@[[CBUUID UUIDWithString:serviceId]]
                                          options:@{CBCentralManagerScanOptionAllowDuplicatesKey: @YES }];
}

RCT_EXPORT_METHOD(send:(NSString *)destId :(NSString *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  CBPeripheral *peripheral = [_connectedPeripherals objectForKey:[[NSUUID alloc] initWithUUIDString:destId]];
  if (peripheral) {
    // IOS device, withResponse -> 512, withoutRespone -> 20
    [self writeToPeripheral:peripheral
                           :[_readyCharacteristics objectForKey:peripheral]
                           :[data dataUsingEncoding:NSUTF8StringEncoding]
                           :0
                           :(int)[peripheral maximumWriteValueLengthForType:CBCharacteristicWriteWithResponse]
                           :resolve
                           :reject];
  } else {
    reject(@"not_found", @"no peripherals", NULL);
  }
}

- (void)writeToPeripheral:(CBPeripheral *)peripheral :(CBCharacteristic *)characteristic :(NSData *)msg :(int)sentIdx :(int)MTU
                         :(RCTPromiseResolveBlock)resolve :(RCTPromiseRejectBlock)reject
{
  if (sentIdx >= [msg length]) {
    char empty[0];
    [peripheral writeValue:[NSData dataWithBytes:empty length:0] forCharacteristic:characteristic type:CBCharacteristicWriteWithResponse];
    resolve(NULL);
  } else {
    // chunking payload upto MTU
    int amountToSend = MIN(MTU, (int)[msg length] - sentIdx);
    __weak typeof(self) weakSelf = self;
    [_writeCallBacks setObject:^(NSError *error)
     {
       if (error) {
         reject(@"sent_err", @"sent_err", error);
       } else {
         [weakSelf writeToPeripheral:peripheral :characteristic :msg :(sentIdx + amountToSend) :MTU :resolve :reject];
       }
     } forKey:peripheral];
    
    NSData *chunk = [NSData dataWithBytes:msg.bytes+sentIdx length:amountToSend];
    [peripheral writeValue:chunk forCharacteristic:characteristic type:CBCharacteristicWriteWithResponse];
  }
}

@end
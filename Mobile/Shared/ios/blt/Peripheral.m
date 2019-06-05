#import "RCTEventDispatcher.h"

#import "Peripheral.h"

static NSString *EVENT_NAME = @"BLUETOOTH_PERIPHERAL";

@implementation BluetoothPeripheral

- (id) init
{
  self = [super init];
  if (self)
  {
    _bluetooth_thread = dispatch_queue_create("biz.kakee.bluetooth", DISPATCH_QUEUE_SERIAL);
    _peripheralMgr = [[CBPeripheralManager alloc] initWithDelegate:self queue:_bluetooth_thread];
    _recvBuf = [[NSMutableData alloc] init];
  }
  
  return self;
}

@synthesize bridge = _bridge;

#pragma mark - CBPeripheralManagerDelegate

/*!
 *  @method peripheralManagerDidUpdateState:
 *
 *  @param peripheral   The peripheral manager whose state has changed.
 *
 *  @discussion         Invoked whenever the peripheral manager's state has been updated. Commands should only be issued when the state is
 *                      <code>CBPeripheralManagerStatePoweredOn</code>. A state below <code>CBPeripheralManagerStatePoweredOn</code>
 *                      implies that advertisement has paused and any connected centrals have been disconnected. If the state moves below
 *                      <code>CBPeripheralManagerStatePoweredOff</code>, advertisement is stopped and must be explicitly restarted, and the
 *                      local database is cleared and all services must be re-added.
 *
 *  @see                state
 *
 */
- (void)peripheralManagerDidUpdateState:(CBPeripheralManager *)peripheral
{
  [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                           body:@{@"type": @"state",
                                                  @"state": [self toStateString:peripheral]}];
}

- (NSString *)toStateString:(CBPeripheralManager *)peripheral
{
  switch (peripheral.state) {
    case CBPeripheralManagerStateUnknown:
      return @"unknown";
    case CBPeripheralManagerStateResetting:
      return @"reset";
    case CBPeripheralManagerStateUnsupported:
      return @"unsupported";
    case CBPeripheralManagerStateUnauthorized:
      return @"unauthorized";
    case CBPeripheralManagerStatePoweredOff:
      return @"off";
    case CBPeripheralManagerStatePoweredOn:
      return @"on";
  }
}

/*!
 *  @method peripheralManager:willRestoreState:
 *
 *  @param peripheral	The peripheral manager providing this information.
 *  @param dict			A dictionary containing information about <i>peripheral</i> that was preserved by the system at the time the app was terminated.
 *
 *  @discussion			For apps that opt-in to state preservation and restoration, this is the first method invoked when your app is relaunched into
 *						the background to complete some Bluetooth-related task. Use this method to synchronize your app's state with the state of the
 *						Bluetooth system.
 *
 *  @seealso            CBPeripheralManagerRestoredStateServicesKey;
 *  @seealso            CBPeripheralManagerRestoredStateAdvertisementDataKey;
 *
 */
- (void)peripheralManager:(CBPeripheralManager *)peripheral willRestoreState:(NSDictionary<NSString *, id> *)dict
{
  NSLog(@"willRestoreState %@", dict);
}

/*!
 *  @method peripheralManagerDidStartAdvertising:error:
 *
 *  @param peripheral   The peripheral manager providing this information.
 *  @param error        If an error occurred, the cause of the failure.
 *
 *  @discussion         This method returns the result of a @link startAdvertising: @/link call. If advertisement could
 *                      not be started, the cause will be detailed in the <i>error</i> parameter.
 *
 */
- (void)peripheralManagerDidStartAdvertising:(CBPeripheralManager *)peripheral error:(nullable NSError *)error
{
  [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                           body:@{@"type": @"state",
                                                  @"state": @"started"}];}

/*!
 *  @method peripheralManager:didAddService:error:
 *
 *  @param peripheral   The peripheral manager providing this information.
 *  @param service      The service that was added to the local database.
 *  @param error        If an error occurred, the cause of the failure.
 *
 *  @discussion         This method returns the result of an @link addService: @/link call. If the service could
 *                      not be published to the local database, the cause will be detailed in the <i>error</i> parameter.
 *
 */
- (void)peripheralManager:(CBPeripheralManager *)peripheral didAddService:(CBService *)service error:(nullable NSError *)error
{
  NSLog(@"willRestoreState add");
}

/*!
 *  @method peripheralManager:central:didSubscribeToCharacteristic:
 *
 *  @param peripheral       The peripheral manager providing this update.
 *  @param central          The central that issued the command.
 *  @param characteristic   The characteristic on which notifications or indications were enabled.
 *
 *  @discussion             This method is invoked when a central configures <i>characteristic</i> to notify or indicate.
 *                          It should be used as a cue to start sending updates as the characteristic value changes.
 *
 */
- (void)peripheralManager:(CBPeripheralManager *)peripheral central:(CBCentral *)central didSubscribeToCharacteristic:(CBCharacteristic *)characteristic
{
  _connectedCentral = central;
  [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                           body:@{@"type": @"connected",
                                                  @"id": [central.identifier UUIDString]}];
}

/*!
 *  @method peripheralManager:central:didUnsubscribeFromCharacteristic:
 *
 *  @param peripheral       The peripheral manager providing this update.
 *  @param central          The central that issued the command.
 *  @param characteristic   The characteristic on which notifications or indications were disabled.
 *
 *  @discussion             This method is invoked when a central removes notifications/indications from <i>characteristic</i>.
 *
 */
- (void)peripheralManager:(CBPeripheralManager *)peripheral central:(CBCentral *)central didUnsubscribeFromCharacteristic:(CBCharacteristic *)characteristic
{
  [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                           body:@{@"type": @"disconnected",
                                                  @"id": [central.identifier UUIDString]}];
}

/*!
 *  @method peripheralManager:didReceiveReadRequest:
 *
 *  @param peripheral   The peripheral manager requesting this information.
 *  @param request      A <code>CBATTRequest</code> object.
 *
 *  @discussion         This method is invoked when <i>peripheral</i> receives an ATT request for a characteristic with a dynamic value.
 *                      For every invocation of this method, @link respondToRequest:withResult: @/link must be called.
 *
 *  @see                CBATTRequest
 *
 */
- (void)peripheralManager:(CBPeripheralManager *)peripheral didReceiveReadRequest:(CBATTRequest *)request
{
  [peripheral respondToRequest:request withResult:CBATTErrorSuccess];
}

/*!
 *  @method peripheralManager:didReceiveWriteRequests:
 *
 *  @param peripheral   The peripheral manager requesting this information.
 *  @param requests     A list of one or more <code>CBATTRequest</code> objects.
 *
 *  @discussion         This method is invoked when <i>peripheral</i> receives an ATT request or command for one or more characteristics with a dynamic value.
 *                      For every invocation of this method, @link respondToRequest:withResult: @/link should be called exactly once. If <i>requests</i> contains
 *                      multiple requests, they must be treated as an atomic unit. If the execution of one of the requests would cause a failure, the request
 *                      and error reason should be provided to <code>respondToRequest:withResult:</code> and none of the requests should be executed.
 *
 *  @see                CBATTRequest
 *
 */
- (void)peripheralManager:(CBPeripheralManager *)peripheral didReceiveWriteRequests:(NSArray<CBATTRequest *> *)requests
{
  for (CBATTRequest *attReq in requests){
    if (attReq.central != _connectedCentral) {
      continue;
    }
    if (attReq.value.length == 0) {
      NSString *msg = [[NSString alloc] initWithData:_recvBuf encoding:NSUTF8StringEncoding];
      [_recvBuf setLength:0];
      [_bridge.eventDispatcher sendAppEventWithName:EVENT_NAME
                                               body:@{@"type": @"msg",
                                                      @"id": [attReq.central.identifier UUIDString],
                                                      @"value": msg}];
    } else {
      [_recvBuf appendData:attReq.value];
    }
    [peripheral respondToRequest:attReq withResult:CBATTErrorSuccess];
  }
}

/*!
 *  @method peripheralManagerIsReadyToUpdateSubscribers:
 *
 *  @param peripheral   The peripheral manager providing this update.
 *
 *  @discussion         This method is invoked after a failed call to @link updateValue:forCharacteristic:onSubscribedCentrals: @/link, when <i>peripheral</i> is again
 *                      ready to send characteristic value updates.
 *
 */
- (void)peripheralManagerIsReadyToUpdateSubscribers:(CBPeripheralManager *)peripheral
{
  if (_onWriteReady) {
    _onWriteReady();
  }
}

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(start:(NSString *)serviceId :(NSString *)characteristicId :(RCTPromiseResolveBlock)resolve :(RCTPromiseRejectBlock)reject)
{
  if (!_serviceId) {
    _serviceId = serviceId;
    _characteristicId = characteristicId;
    // Start with the CBMutableCharacteristic
    CBCharacteristicProperties props = CBCharacteristicPropertyWrite|CBCharacteristicPropertyRead|CBCharacteristicPropertyNotifyEncryptionRequired;
    _characteristic = [[CBMutableCharacteristic alloc]
                       initWithType:[CBUUID UUIDWithString:_characteristicId]
                       properties:props
                       value:nil
                       permissions:CBAttributePermissionsWriteEncryptionRequired|CBAttributePermissionsReadEncryptionRequired];
    
    // Then the service
    CBMutableService *transferService = [[CBMutableService alloc] initWithType:[CBUUID UUIDWithString:_serviceId] primary:YES];
    
    // Add the characteristic to the service
    transferService.characteristics = @[_characteristic];
    
    // And add it to the peripheral manager
    [_peripheralMgr addService:transferService];
    
    [_peripheralMgr startAdvertising:@{CBAdvertisementDataServiceUUIDsKey: @[[CBUUID UUIDWithString:_serviceId]] }];
  }
}

RCT_EXPORT_METHOD(stop: resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  [_peripheralMgr stopAdvertising];
  [_peripheralMgr removeAllServices];
}

RCT_EXPORT_METHOD(send:(NSString *)msg resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  [self notifyToCentral:[msg dataUsingEncoding:NSUTF8StringEncoding] :0 :(int)[_connectedCentral maximumUpdateValueLength] :resolve :reject];
}

- (void)notifyToCentral:(NSData *)msg :(int)sendIdx :(int)NOTIFY_MTU :(RCTPromiseResolveBlock)resolve :(RCTPromiseRejectBlock)reject
{
  int msgLen = (int) [msg length];
  __weak typeof(self) weakSelf = self;
  while (sendIdx < msgLen) {
    int amountToSend = MIN(NOTIFY_MTU, msgLen - sendIdx);
    NSData *chunk = [NSData dataWithBytes:msg.bytes+sendIdx length:amountToSend];
    if ([_peripheralMgr updateValue:chunk forCharacteristic:_characteristic onSubscribedCentrals:@[_connectedCentral]]) {
      // sent, remove call back
      sendIdx += amountToSend;
    } else {
      // If it didn't work, drop out and wait for the callback
      _onWriteReady = ^()
      {
        [weakSelf notifyToCentral:msg :sendIdx :NOTIFY_MTU :resolve :reject];
      };
      return;
    }
  }
  
  char empty[0];
  if ([_peripheralMgr updateValue:[NSData dataWithBytes:empty length:0]
                forCharacteristic:_characteristic
             onSubscribedCentrals:@[_connectedCentral]]) {
    _onWriteReady = nil;
    resolve(NULL);
  } else {
    // If it didn't work, drop out and wait for the callback
    _onWriteReady = ^()
    {
      [weakSelf notifyToCentral:msg :sendIdx :NOTIFY_MTU :resolve :reject];
    };
  }
}

@end
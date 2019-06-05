#import <RCTBridgeModule.h>

#import <CoreBluetooth/CoreBluetooth.h>

typedef void(^onWriteReady)();

@interface BluetoothPeripheral : NSObject<RCTBridgeModule, CBPeripheralManagerDelegate>

@property dispatch_queue_t bluetooth_thread;
@property CBPeripheralManager *peripheralMgr;

@property NSString *serviceId;
@property NSString *characteristicId;

@property CBMutableCharacteristic *characteristic;
@property NSData *dataToSend;
@property NSInteger sendDataIndex;

@property NSMutableData *recvBuf;
@property CBCentral *connectedCentral;
@property onWriteReady onWriteReady;

@end
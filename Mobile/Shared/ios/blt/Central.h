#import <RCTBridgeModule.h>

#import <CoreBluetooth/CoreBluetooth.h>

typedef void(^WriteCallBack)(NSError *);

@interface BluetoothCentral : NSObject<RCTBridgeModule, CBCentralManagerDelegate, CBPeripheralDelegate>

@property  dispatch_queue_t bluetooth_thread;
@property  CBCentralManager *centralManager;

@property NSMutableDictionary<CBPeripheral*, NSMutableData*> *discoveredPeripherals;
@property NSMutableDictionary<CBPeripheral*,CBCharacteristic*> *readyCharacteristics;
@property NSMutableDictionary<NSUUID*, CBPeripheral*> *connectedPeripherals;
@property NSMutableDictionary<CBPeripheral*, WriteCallBack> *writeCallBacks;

@property NSString *serviceId;
@property NSString *characteristicId;

@end
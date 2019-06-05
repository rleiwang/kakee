#import "RCTEventDispatcher.h"

#import "Printers.h"

@implementation Printers

- (id) init
{
  self = [super init];
  if (self)
  {
    self.printer_thread = dispatch_queue_create("biz.kakee.printer", DISPATCH_QUEUE_SERIAL);
    self.dotPrinter = [[DotMatrixPrinter alloc] init];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(_checkPrinterConnect:)
                                                 name:EAAccessoryDidConnectNotification
                                               object:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(_checkPrinterConnect:)
                                                 name:EAAccessoryDidDisconnectNotification
                                               object:nil];
    
    [[EAAccessoryManager sharedAccessoryManager] registerForLocalNotifications];
  }
  
  return self;
}

RCT_EXPORT_MODULE(Printers);

RCT_REMAP_METHOD(searchPrinters,
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(self.printer_thread,
                 ^{
                   resolve([self.dotPrinter connectedBluetoothPrinters]);
                 });
}

RCT_EXPORT_METHOD(print:(NSDictionary *)JSON
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(self.printer_thread,
                 ^{
                   [self.dotPrinter print:JSON];
                   resolve([NSNull null]);
                 });
}

#pragma mark Internal

@synthesize bridge = _bridge;

- (void)_checkPrinterConnect:(NSNotification *)notification
{
  if ([[self.dotPrinter connectedBluetoothPrinters] count] > 0) {
    [self.bridge.eventDispatcher sendAppEventWithName:@"PrinterConnected" body:@{}];
  } else {
    [self.bridge.eventDispatcher sendAppEventWithName:@"PrinterDisconnected" body:@{}];
  }
}

@end
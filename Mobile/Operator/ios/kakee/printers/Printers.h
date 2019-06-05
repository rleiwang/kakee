#import <RCTBridgeModule.h>

#import "DotMatrixPrinter.h"

@interface Printers : NSObject<RCTBridgeModule>

@property dispatch_queue_t printer_thread;
@property DotMatrixPrinter *dotPrinter;

@end
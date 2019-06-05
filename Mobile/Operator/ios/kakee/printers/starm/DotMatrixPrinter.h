#import <StarIO/SMPort.h>

typedef enum
{
  FULL_CUT = '0',
  PARTIAL_CUT = '1',
  FULL_CUT_FEED = '2',
  PARTIAL_CUT_FEED = '3'
} CutType;

@interface DotMatrixPrinter : NSObject

@property PortInfo *portInfo;

- (NSArray *) connectedBluetoothPrinters;

- (void) print:(NSDictionary *)JSON;
@end
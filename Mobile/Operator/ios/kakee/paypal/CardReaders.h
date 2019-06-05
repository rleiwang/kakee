#import <RCTBridgeModule.h>

#import <PayPalHereSDK/PPHCardReaderDelegate.h>


@interface CardReaders : NSObject<RCTBridgeModule, PPHCardReaderDelegate>

// get singleton to make sure the same react native module for card reader delegate
+ (id) getSingleton;

-(void) sendEvent:(NSDictionary *)event;

@end
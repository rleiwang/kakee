#import <RCTBridgeModule.h>

#import <BraintreePayPal.h>

@interface Braintree : NSObject<RCTBridgeModule, BTViewControllerPresentingDelegate>

// get singleton to make sure the same react native module for braintree delegate
+ (id) getSingleton;

@end
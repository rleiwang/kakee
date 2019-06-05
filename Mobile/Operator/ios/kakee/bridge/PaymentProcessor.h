//
//  PaymentProcessor.h
//

#import <RCTBridgeModule.h>

#import "PayPal.h"

@interface PaymentProcessor : NSObject<RCTBridgeModule>

@property (nonatomic, strong) PayPalPOS *payPal;

@end

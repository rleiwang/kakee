//
//  PayPal.h
//

#import <PayPalHereSDK/PPHTransactionControllerDelegate.h>
#import <PayPalHereSDK/PPHTransactionWatcher.h>
#import <PayPalHereSDK/PPHCardReaderDelegate.h>
#import <PayPalHereSDK/PPHLoggingDelegate.h>
#import <payPalHereSDK/PPHMerchantInfo.h>
#import <PayPalHereSDK/PPHInvoice.h>

@interface PayPalPOS : NSObject<PPHTransactionControllerDelegate, PPHLoggingDelegate>

@property (nonatomic) PPHCardReaderWatcher *cardWatcher;
@property (nonatomic) id<PPHLoggingDelegate> sdkLogger;
@property (nonatomic) PPHMerchantInfo *merchant;
@property (nonatomic, strong) void (^txStatusCallback)(NSArray *);

- (id) initWithResponse:(NSDictionary *)JSON thenCallbackAfterSetup:(void (^)(NSArray *))afterSetup;

-(void) chargeCard:(NSDictionary *)JSON thenCallbackWithStatus:(void (^)(NSArray *))onStatus;

//
- (PPHInvoice *) createInvoice:(NSDictionary *)JSON;

@end
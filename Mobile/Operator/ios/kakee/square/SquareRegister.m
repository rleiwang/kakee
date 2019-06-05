#import "RCTEventDispatcher.h"

#import "SquareRegister.h"

#import <SquareRegisterSDK.h>

typedef void(^onSquareRegisterResponse)(NSNotification *);

// same as defied in AppDelegate.m
static NSString *squareUrlScheme = @"com.squareup.square";

@implementation SquareRegister

@synthesize bridge = _bridge;
static onSquareRegisterResponse _onSquareRegisterResponse;

static id singleton = nil;
- (id)init {
  if (singleton)
  {
    return singleton;
  }
  self = singleton = [super init];
  
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(_returnFromSquareRegister:)
                                               name:squareUrlScheme
                                             object:nil];
  return self;
}


RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(chargeCard:(NSDictionary *)JSON
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  // Always set the client ID before creating your first API request.
  [SCCAPIRequest setClientID:@"sq0idp-_PbJ8KvDT2J0Ra482dGSdg"];
  
  // Replace with your app's callback URL.
  NSURL * callbackURL = [NSURL URLWithString:@"com.tristonetech.kakee.Operator.square://payments"];
  
  NSDecimalNumber *quantity = [NSDecimalNumber decimalNumberWithString:[JSON objectForKey:@"qty"]];
  NSDecimalNumber *unitPrice = [NSDecimalNumber decimalNumberWithString:[JSON objectForKey:@"unitPrice"]];
  NSDecimalNumber *taxRate = [[NSDecimalNumber decimalNumberWithString:[JSON objectForKey:@"taxRate"]]
                              decimalNumberByAdding:[NSDecimalNumber decimalNumberWithString:@"1.0"]];
  
  NSDecimalNumber *OneHundred = [NSDecimalNumber decimalNumberWithString:@"100"];
  NSDecimalNumberHandler *behavior = [NSDecimalNumberHandler decimalNumberHandlerWithRoundingMode:NSRoundUp
                                                                                            scale:2
                                                                                 raiseOnExactness:NO
                                                                                  raiseOnOverflow:NO
                                                                                 raiseOnUnderflow:NO
                                                                              raiseOnDivideByZero:NO];
  NSInteger total = [[[[[quantity decimalNumberByMultiplyingBy:unitPrice] decimalNumberByMultiplyingBy:taxRate]
                       decimalNumberByRoundingAccordingToBehavior:behavior] decimalNumberByMultiplyingBy:OneHundred] integerValue];
  
  NSString *currencyCode = [[NSLocale currentLocale] objectForKey:NSLocaleCurrencyCode];
  
  NSError *error = nil;
  
  // Specify the amount of money to charge.
  SCCMoney * amount = [SCCMoney moneyWithAmountCents:total currencyCode:currencyCode error:&error];
  
  if (error) {
    reject(@"invalid_request", @"invalid_request", error);
    return;
  }
  
  // Initialize the request.
  NSString *orderId = [JSON objectForKey:@"orderId"];
  SCCAPIRequest *const request = [SCCAPIRequest requestWithCallbackURL:callbackURL
                                                                amount:amount
                                                        userInfoString:orderId
                                                            merchantID:nil
                                                                 notes:orderId
                                                  supportedTenderTypes:SCCAPIRequestTenderTypeAll
                                                     clearsDefaultFees:YES
                                       returnAutomaticallyAfterPayment:YES
                                                                 error:&error];
  
  if (error) {
    reject(@"invalid_request", @"invalid_request", error);
    return;
  }
  
  _onSquareRegisterResponse = ^(NSNotification *notification) {
    NSURL *url = [notification object];
    
    if (url) {
      NSError *decodeError = nil;
      
      // Wrap the returned data in an SCCAPIResponse object
      SCCAPIResponse *const response = [SCCAPIResponse responseWithResponseURL:url error:&decodeError];
      if (decodeError) {
        reject(@"error_response", @"error_response", decodeError);
      } else {
        
        NSDecimalNumber *paid =  [NSDecimalNumber decimalNumberWithDecimal:[[NSNumber numberWithInteger:total] decimalValue]];
        resolve(@{@"orderId": [self emptyString:[response userInfoString]],
                  @"isSuccess": [NSNumber numberWithBool:[response isSuccessResponse]],
                  @"txId": [self emptyString:[response transactionID]],
                  @"paid": [[paid decimalNumberByDividingBy:OneHundred] decimalNumberByRoundingAccordingToBehavior:behavior],
                  @"clientTxId": [self emptyString:[response clientTransactionID]]});
      }
    } else {
      reject(@"empty_response", @"empty_response", NULL);
    }
  };
  
  // Perform the request.
  if (![SCCAPIConnection performRequest:request error:&error]) {
    reject(@"err_invoke", @"err_invoke", error);
  }
}

- (void)_returnFromSquareRegister:(NSNotification *)notification
{
  if (_onSquareRegisterResponse) {
    _onSquareRegisterResponse(notification);
  }
}

- (id)emptyString:(NSString *)str
{
  return str ? str : [NSNull null];
}
@end
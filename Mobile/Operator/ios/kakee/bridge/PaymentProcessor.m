//
//  PaymentProcessor.m
//

#import <RCTLog.h>
#import "RCTEventDispatcher.h"

#import "PaymentProcessor.h"

@implementation PaymentProcessor

RCT_EXPORT_MODULE(PaymentProcessor);

RCT_EXPORT_METHOD(checkPayPal
                  :(RCTPromiseResolveBlock)resolve
                  :(RCTPromiseRejectBlock)reject)
{
  resolve([NSNumber numberWithBool:(self.payPal ? true : false)]);
}

RCT_EXPORT_METHOD(initProcessor:(NSDictionary *)JSON
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (self.payPal) {
    resolve(@[[NSNumber numberWithBool:true]]);
  } else {
    dispatch_async(dispatch_get_main_queue(), ^{
      self.payPal = [[PayPalPOS alloc] initWithResponse:JSON
                                 thenCallbackAfterSetup:^void(NSArray *status)
                     {
                       resolve(status);
                     }];
    });
  }
}

@synthesize bridge = _bridge;

RCT_EXPORT_METHOD(chargeCard:(NSDictionary *)JSON
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (self.payPal)
  {
    dispatch_async(dispatch_get_main_queue(), ^{
      //begin tx
      [self.bridge.eventDispatcher sendAppEventWithName:@"CardReaderEvent" body:@{@"type": @"begin"}];
      
      [self.payPal chargeCard:JSON thenCallbackWithStatus:^void(NSArray *status)
       {
         if (status[0] != [NSNull null]) {
           reject(@"card err", status[0], NULL);
         } else {
           resolve(status[1]);
         }
         
         //end tx
         [self.bridge.eventDispatcher sendAppEventWithName:@"CardReaderEvent" body:@{@"type:": @"end"}];
       }];
    });
  }
  else
  {
    reject(@"paypal_empty", @"uninitialized paypal", NULL);
  }
}

@end

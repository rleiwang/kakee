#import "Braintree.h"

@implementation Braintree

static id singleton = nil;

+(id) getSingleton
{
  return singleton;
}

- (id)init {
  if (singleton)
  {
    return singleton;
  }
  self = singleton = [super init];
  return self;
}


RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(checkout:(NSDictionary*)JSON :(RCTPromiseResolveBlock)resolve :(RCTPromiseRejectBlock)reject)
{
  @autoreleasepool {
    BTAPIClient *braintreeClient = [[BTAPIClient alloc] initWithAuthorization:[JSON objectForKey:@"token"]];
    
    BTPayPalDriver *payPalDriver = [[BTPayPalDriver alloc] initWithAPIClient:braintreeClient];
    payPalDriver.viewControllerPresentingDelegate = self;
    
    BTPayPalRequest *request= [[BTPayPalRequest alloc] initWithAmount:[JSON objectForKey:@"amount"]];
    request.currencyCode = @"USD"; // Optional; see BTPayPalRequest.h for other options
    
    [payPalDriver requestOneTimePayment:request completion:
     ^(BTPayPalAccountNonce * _Nullable tokenizedPayPalAccount, NSError * _Nullable error)
     {
       if (tokenizedPayPalAccount && tokenizedPayPalAccount.nonce) {
         /*
          NSLog(@"Got a nonce: %@", tokenizedPayPalAccount.nonce);
          
          // Access additional information
          NSString *email = tokenizedPayPalAccount.email;
          NSString *firstName = tokenizedPayPalAccount.firstName;
          NSString *lastName = tokenizedPayPalAccount.lastName;
          NSString *phone = tokenizedPayPalAccount.phone;
          
          // See BTPostalAddress.h for details
          BTPostalAddress *billingAddress = tokenizedPayPalAccount.billingAddress;
          BTPostalAddress *shippingAddress = tokenizedPayPalAccount.shippingAddress;
          */
         resolve(@{@"status": @"success",
                   @"nonce": tokenizedPayPalAccount.nonce,
                   @"amount": [JSON objectForKey:@"amount"],
                   @"orderId": [JSON objectForKey:@"orderId"]
                   });
       } else if (error) {
         reject(@"tx_err", @"tx_err", error);
       } else {
         resolve(@{@"status": @"cancel"});
       }
     }];
  }
}

/// The payment driver requires presentation of a view controller in order to proceed.
///
/// Your implementation should present the viewController modally, e.g. via
/// `presentViewController:animated:completion:`
///
/// @param driver         The payment driver
/// @param viewController The view controller to present
- (void)paymentDriver:(id)driver requestsPresentationOfViewController:(UIViewController *)viewController
{
  UIViewController *uiNavCtrl = [[[[UIApplication sharedApplication] delegate] window] rootViewController];
  [uiNavCtrl presentViewController:viewController animated:YES completion:nil];
}

/// The payment driver requires dismissal of a view controller.
///
/// Your implementation should dismiss the viewController, e.g. via
/// `dismissViewControllerAnimated:completion:`
///
/// @param driver         The payment driver
/// @param viewController The view controller to be dismissed
- (void)paymentDriver:(id)driver requestsDismissalOfViewController:(UIViewController *)viewController
{
  UIViewController *uiNavCtrl = [[[[UIApplication sharedApplication] delegate] window] rootViewController];
  [uiNavCtrl dismissViewControllerAnimated:YES completion:nil];
}

@end
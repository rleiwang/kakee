//
// PayPal.m
//

#import <AVFoundation/AVAudioSession.h>
#import <UIKit/UIKit.h>

#import <PayPalHereSDK/PayPalHereSDK.h>

#import "AppDelegate.h"

#import "CardReaders.h"
#import "PayPal.h"

@implementation PayPalPOS

/*
 * Called when we have JSON that contains an access token.  Which this is
 * the case we'll attempt to decrypt the access token and configure the SDK
 * to use it.  If successful this call will conclude the login process and
 * launch the TransactionViewController which is then entry point into the
 * rest of the SDK.
 */
- (id) initWithResponse:(NSDictionary *)JSON thenCallbackAfterSetup:(void (^)(NSArray *))afterSetup
{
  self = [super init];
  if (self)
  {
    self.cardWatcher = [[PPHCardReaderWatcher alloc] initWithDelegate:[CardReaders getSingleton]];
    
    /*
     * How to configure the SDK to use Live vs Sandbox
     */
    BOOL isProd = [[JSON objectForKey:@"isProd"] boolValue];
    [PayPalHereSDK selectEnvironmentWithType: isProd ? ePPHSDKServiceType_Live : ePPHSDKServiceType_Sandbox];
    
    /* By default, the SDK has a remote logging facility for warnings and errors. This helps PayPal immensely in
     * diagnosing issues, but is obviously up to you as to whether you want to do remote logging, or perhaps you
     * have your own logging infrastructure. This sample app intercepts log messages and writes errors to the
     * remote logger but not warnings.
     */
    self.sdkLogger = [PayPalHereSDK loggingDelegate];
    [PayPalHereSDK setLoggingDelegate:self];
    
    /*
     * Let's tell the SDK who is referring these customers.
     * The referrer code is an important value which helps PayPal know which businesses and SDK
     * users are bringing customers into the PayPal system.  The referrer code is stored in the
     * invoices that are sent to the backend.
     */
    [PayPalHereSDK setReferrerCode:@"TriStone Technology, Inc"];
    
    // Either the app, or the SDK must requrest location access if we'd like
    // the SDK to take payments.
    if ([PayPalHereSDK askForLocationAccess])
    {
      [PayPalHereSDK startWatchingLocation];
    }
    
    /*!
     * This is now the de-facto way to initialize the PPH SDK. The current API - setActiveMerchant
     * - will be marked for deprecation and will be removed at some point in the future.
     * As before, this initialization sequence will ensure that we persist certain merchant information
     * in secure storage. This allows the PPH SDK to re-use this information - such as email id - when such
     * info is not available through our API calls to backend.
     *
     * HOW THIS METHOD WORKS: Once login is complete, you - the application - should have the following information:
     * a) An access token - this is a limited validity token that usually expires after 8 hours
     * b) Refresh Url - an endpoint that we can make a GET request to to fetch a new access token. When the access token expires
     * we will automatically invoke this endpoint to refresh the access token
     * c) Expiry time - this number usually indicates the time left (in seconds) before the access token expires.
     * You - the application - provide us these 3 pieces of data to the SDK and we in turn use this to set up some basic
     * information we need to know in order to make payment flows possible. For ex: we need to determine the merchant's
     * currency code to properly set up transactions. During initialization we fetch this - and other - details about the merchant
     * from our databases and create a PPHMerchantInfo object that we then return to the application in the completion handler.
     * The application is able to make some custom changes to non read-only properties of the merchant object and at the same
     * time this allows the SDK to ensure we have the minimum set of information we need to be able to process transactions.
     * NOTE: You MUST wait for the completion handler to fire AND check the status (PPHInitResultType) to determine that the
     * initialization was successful before attempting to proceed with the transaction flow.
     *
     * @param access_token The Access token returned to you from PayPal Access. You will get this after the OAuth flow is completed
     * @param refresh_url Also obtained after the OAuth flow. Once the merchant has authorized your application to make transactions on
     * your behalf you will be able to get the access token and the refresh url from PayPal Access endpoint
     * @param tokenExpiryOrNil this is a nice to have and will allow the SDK to predictively pre-fetch a new token when the current token is about
     * to expire. Consider this case: it is possible - although unlikely - that the validity of the access token can expire between the time
     * your application starts a new transaction and the time it actually submits the transaction to PayPal. In this case, we will re-attempt the
     * transaction automatically after refreshing the access token but this extra call will result in a longer time taken and hence
     * a poor user experience. Setting a valid expiry time will help mitigate this scenario
     * @param completionHandler The handler that will fire once initialization is done. Your application MUST check the PPHInitResultType to ensure
     * there were no errors.
     */
    [PayPalHereSDK setupWithCredentials: [JSON objectForKey:@"access_token"]
                             refreshUrl: [NSString stringWithFormat:@"%@&operatorId=%@", [JSON objectForKey:@"refresh_url"], [JSON objectForKey:@"operatorId"]]
                       tokenExpiryOrNil: [JSON objectForKey:@"expires_in"]
                  thenCompletionHandler:^(PPHInitResultType status, PPHError *error, PPHMerchantInfo *info)
     {
       if (status == ePPHAccessResultSuccess)
       {
         self.merchant = info;
       }
       else
       {
         NSLog(@"%ld here %@", (long)status, error);
       }
       afterSetup(@[[NSNumber numberWithBool:status == ePPHAccessResultSuccess], [PayPalHereSDK sdkVersion]]);
     }];
  }
  return self;
}

-(void) chargeCard:(NSDictionary *)JSON thenCallbackWithStatus:(void (^)(NSArray *))onStatus
{
  // do a clean up first
  [[PayPalHereSDK sharedTransactionManager] cancelPayment];
  
  // reset callback
  self.txStatusCallback = onStatus;
  
  // STEP #1 to take an EMV related payment.
  [[PayPalHereSDK sharedTransactionManager] beginPaymentUsingUIWithInvoice:[self createInvoice:JSON]
                                                     transactionController:self];
}

- (PPHInvoice *) createInvoice:(NSDictionary *)JSON
{
  PPHInvoice *invoice = [[PPHInvoice alloc] initWithCurrency:@"USD"];
  
  [invoice addItemWithId:[JSON objectForKey:@"orderId"]
                    name:[JSON objectForKey:@"details"]
                quantity:[NSDecimalNumber decimalNumberWithString:[JSON objectForKey:@"qty"]]
               unitPrice:[NSDecimalNumber decimalNumberWithString:[JSON objectForKey:@"unitPrice"]]
                 taxRate:[NSDecimalNumber decimalNumberWithString:[JSON objectForKey:@"taxRate"]]
             taxRateName:@"taxRate"];
  
  // itemId <=> paypal
  invoice.note = [JSON objectForKey:@"orderId"];
  
  return invoice;
}

- (id)emptyString:(NSString *)str
{
  return str ? str : [NSNull null];
}

- (NSDictionary *)details:(PPHInvoiceTotals *)totals totalAmount:(PPHAmount *)totalAmount fees:(NSDecimalNumber *)fees
{
  if (totals && totalAmount)
  {
    return @{@"total": totalAmount.amount,
             @"fees": fees ? fees : [NSNull null],
             @"subTotal": totals.subTotal,
             @"gratuityTotal": totals.gratuityTotal,
             @"refundTotal": totals.refundTotal,
             @"taxTotal": totals.taxTotal,
             @"taxDetails": totals.taxDetails ? totals.taxDetails : @{}};
  }
  else if (totals)
  {
    return @{@"fees": fees ? fees : [NSNull null],
             @"subTotal": totals.subTotal,
             @"gratuityTotal": totals.gratuityTotal,
             @"refundTotal": totals.refundTotal,
             @"taxTotal": totals.taxTotal,
             @"taxDetails": totals.taxDetails ? totals.taxDetails : @{}};
    
  }
  else if (totalAmount)
  {
    return @{@"total": totalAmount.amount,
             @"fees": fees ? fees : [NSNull null]};
    
  }
  return @{};
}

#pragma PPHTransactionControllerDelegate implementation

/*!
 * This delegate method will be called by the EMVSDK whenever a user selects a payment method by
 * presenting their card. Mandatory if your app would like to take custom action such as handling tips
 * before letting the EMVSDK continue. Gives you a chance to modify the transaction total.
 * @param paymentOption the type of payment option the user selected.
 */
- (void) userDidSelectPaymentMethod:(PPHPaymentMethod) paymentOption
{
  // When the customer either taps, inserts or swipes their card, SDK would call you with this.
  // Update your invoice here, if needed, before we proceed with the transaction.
  // IMPORTANT NOTE : For a contactless transaction, refrain from updating the invoice once the card is tapped.
  __weak typeof(self) weakSelf = self;
  
  [[self getCurrentNavigationController] dismissViewControllerAnimated:true completion:nil];
  
  // STEP #3 to take an EMV payment.
  [[PayPalHereSDK sharedTransactionManager] processPaymentUsingUIWithPaymentType:paymentOption
                                                               completionHandler:^(PPHTransactionResponse *response)
   {
     // switch UI back to react native
     UINavigationController *uiNavCtrl = [weakSelf getCurrentNavigationController];
     uiNavCtrl.navigationBar.hidden = YES;
     [uiNavCtrl popToRootViewControllerAnimated:YES];
     
     if (self.txStatusCallback)
     {
       if (response.error)
       {
         self.txStatusCallback(@[response.error]);
       }
       else
       {
         PPHTransactionRecord *record = response.record;
         self.txStatusCallback(@[[NSNull null],
                                 @{@"orderId": [self emptyString:record.invoice.note],
                                   @"status": [self txStatus:record.transactionStatus],
                                   @"details": [self details:record.invoice.totals totalAmount:record.invoice.totalAmount
                                                        fees:record.invoice.totalFees],
                                   @"txId": [self emptyString:record.transactionId],
                                   @"invId": [self emptyString: record.payPalInvoiceId],
                                   @"txDate": [NSNumber numberWithDouble:[record.date timeIntervalSince1970]],
                                   @"authId": [self emptyString:record.authorizationId],
                                   @"authCode": [self emptyString:record.authCode],
                                   @"txHandle": [self emptyString:record.transactionHandle],
                                   @"crlId": [self emptyString:record.correlationId],
                                   @"customer": [self customerId:record.customerInfo :record.encryptedCardData],
                                   @"paypal": [NSNumber numberWithBool:record.paidWithPayPal],
                                   @"rptToken": [self emptyString:record.receiptPreferenceToken],
                                   @"rptContact": [self toDest:record.receiptDestination]}
                                 ]);
       }
       self.txStatusCallback = nil;
     }
   }];
}

- (id) toDest:(PPHReceiptDestination *)dest
{
  if (dest)
  {
    return @{ @"isEmail": [NSNumber numberWithBool:dest.isEmail],
              @"dest": [self emptyString:dest.destinationAddress]};
  }
  
  return [NSNull null];
}

- (id) customerId:(PPHTokenizedCustomerInformation *)customerInfo :(PPHCardSwipeData *)cardData
{
  if (customerInfo)
  {
    NSString *name = nil;
    if (cardData)
    {
      name = cardData.cardholderName;
    }
    
    return @{@"id": [self emptyString:customerInfo.customerId],
             @"name": [self emptyString:name],
             @"email": [self emptyString:customerInfo.maskedEmailAddress],
             @"phone": [self emptyString:customerInfo.maskedMobileNumber],
             @"token": customerInfo.receiptPreferenceToken};
  }
  
  return [NSNull null];
}

- (id) txStatus:(PPHTransactionStatus)status
{
  switch (status) {
    case    ePPHTransactionStatusPaid:
      return @"Paid";
    case ePPHTransactionStatusPaymentDeclined:
      return @"Declined";
    case ePPHTransactionStatusPaymentCancelled:
      return @"Cancelled";
    case ePPHTransactionStatusRefunded:
      return @"Refunded";
    case ePPHTransactionStatusPartiallyRefunded:
      return @"PartiallyRefunded";
    case ePPHTransactionStatusRefundDeclined:
      return @"RefundDeclined";
    case ePPHTransactionStatusRefundCancelled:
      return @"RefundCancelled";
  }
  return [NSNull null];
}

/*!
 * This delegate method will be called by the EMVSDK whenever a user selects a refund method by
 * presenting their card. Mandatory if your app would like to take custom action before letting
 * the EMVSDK continue. Gives you a chance to modify the transaction total.
 * @param refundOption the type of refund payment option user selected.
 */
- (void)userDidSelectRefundMethod:(PPHPaymentMethod) refundOption
{
  
}

/*!
 * Mandatory if you are using the EMVSDK. Returns a reference to a
 * navigation controller we drive UI off of.
 */
- (UINavigationController *)getCurrentNavigationController
{
  UINavigationController *uiNavCtrl =
  (UINavigationController *) [[[[UIApplication sharedApplication] delegate] window] rootViewController];
  uiNavCtrl.navigationBar.hidden = NO;
  return uiNavCtrl;
}

/*!
 * This message is sent to the delegate right before the receipt options screen appears.
 * If your app does automatic receipt printing, this is a good place to do it.
 *
 * @param record A description of the current transaction
 */
- (void)receiptOptionsWillAppearForRecord:(PPHTransactionRecord *)record
{
  
}

/*!
 * To conserve battery life the contactless listener of the reader may timeout, in which case this
 * method will be called so you may instruct the SDK to take a specific action. If this delegate
 * method is unimplemented the SDK will default to ePPHContactlessTimeoutActionCancelTransaction
 */
- (PPHContactlessTimeoutAction)contactlessTimeoutAction
{
  return ePPHContactlessTimeoutActionCancelTransaction;
}

/*!
 * The user added a gratuity to PPHTransactionManager's currentInvoice through prompts on the reader
 *
 * @param invoice The invoice that was updated. The same instance that is the currentInvoice of PPHTransactionManager
 */
- (void)userAddedGratuityToInvoice:(PPHInvoice *)invoice
{
  
}

/*!
 * Gets called when the reader has been activated for payments and is ready to process card present data.
 * Handle any non-EMV SDK related processing once this comes back.
 */
- (void)readerDidActivateForPayments
{
  [[CardReaders getSingleton] sendEvent:@{@"type": @"activated"}];
}

/*!
 * Gets called when the reader has been de-activated for payments.
 * We have not dropped connection with the reader, but our reader will not process any card present data.
 * To enable the reader for payments again, just call activateReaderForPayments when you are ready and take
 * a payment against the current TM invoice, or simply start a new transaction.
 * Deactivation can occur if a user presses cancel on the terminal before presenting their card to the terminal.
 * Deactivation can also occur if you have explicitly called deActivateReaderForPayment.
 */
- (void)readerDidDeactivateForPayments
{
  [[CardReaders getSingleton] sendEvent:@{@"type": @"deactivated"}];
}

@end
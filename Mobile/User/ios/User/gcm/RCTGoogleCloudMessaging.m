#import "RCTGoogleCloudMessaging.h"

#import "RCTEventDispatcher.h"

@implementation RCTGoogleCloudMessaging

@synthesize bridge = _bridge;
static id singleton = nil;

static NSMutableArray *_notifications = nil;

+ (void) initStatic
{
  if (_notifications == nil) {
    _notifications = [[NSMutableArray alloc] init];
  }
}

+ (void) addNotification:(NSDictionary *)notification
{
  [_notifications addObject:@{
                              @"operatorId": [notification objectForKey:@"operatorId"],
                              @"orderId": [notification objectForKey:@"orderId"],
                              @"status": [notification objectForKey:@"status"]
                              }];
}

+(RCTGoogleCloudMessaging *) getSingleton
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

- (void) registerToken:(NSData *) deviceToken
{
  if (deviceToken) {
    self.deviceToken = deviceToken;
  }
  
  [[GGLInstanceID sharedInstance] tokenWithAuthorizedEntity:[[[GGLContext sharedInstance] configuration] gcmSenderID]
                                                      scope:kGGLInstanceIDScopeGCM
                                                    options:@{
                                                              kGGLInstanceIDRegisterAPNSOption: self.deviceToken,
                                                              kGGLInstanceIDAPNSServerTypeSandboxOption: @NO
                                                              }
                                                    handler:^(NSString *gcmToken, NSError *error)
   {
     if (gcmToken != nil) {
       //weakSelf.registrationToken = registrationToken;
       //NSLog(@"Registration Token: %@", registrationToken);
       //[weakSelf subscribeToTopic];
       self.registrationToken = gcmToken;
       [self.bridge.eventDispatcher sendAppEventWithName:@"TokenRefreshed" body:self.registrationToken];
     } else {
       //NSLog(@"Registration to GCM failed with error: %@", error.localizedDescription);
       [[NSNotificationCenter defaultCenter] postNotificationName:@"onRegistrationCompleted"
                                                           object:nil
                                                         userInfo:@{@"error": error.localizedDescription}];
     }
   }];
}

/**
 *  Called when the system determines that tokens need to be refreshed.
 *  This method is also called if Instance ID has been reset in which
 *  case, tokens and `GcmPubSub` subscriptions also need to be refreshed.
 *
 *  Instance ID service will throttle the refresh event across all devices
 *  to control the rate of token updates on application servers.
 */
- (void)onTokenRefresh
{
  // A rotation of the registration tokens is happening, so the app needs to request a new token.
  //NSLog(@"The GCM registration token needs to be changed.");
  [self registerToken:nil];
}

/**
 *  The callback is invoked once GCM processes the message. If processing fails, the
 *  callback is invoked with a valid error object representing the error.
 *  Otherwise, the message is ready to be sent.
 *
 *  @param messageID The messageID for the message that failed to be sent upstream.
 *  @param error     The error describing why the send operation failed.
 */
- (void)willSendDataMessageWithID:(NSString *)messageID error:(NSError *)error
{
  
}

/**
 *  This callback is invoked if GCM successfully sent the message upstream
 *  and the message was successfully received.
 *
 *  @param messageID The messageID for the message sent.
 */
- (void)didSendDataMessageWithID:(NSString *)messageID
{
  
}

/**
 *  Called when the GCM server deletes pending messages due to exceeded
 *  storage limits. This may occur, for example, when the device cannot be
 *  reached for an extended period of time.
 *
 *  It is recommended to retrieve any missing messages directly from the
 *  app server.
 */
- (void)didDeleteMessagesOnServer
{
  
}

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(fetchToken:(RCTPromiseResolveBlock)resolve :(RCTPromiseRejectBlock)reject)
{
  resolve(self.registrationToken);
}

RCT_EXPORT_METHOD(fetchNotifications:(RCTPromiseResolveBlock)resolve :(RCTPromiseRejectBlock)reject)
{
  NSMutableArray *tmp = _notifications;
  _notifications = [[NSMutableArray alloc] init];
  if (tmp) {
    resolve([tmp copy]);
    tmp = nil;
  }
}

@end
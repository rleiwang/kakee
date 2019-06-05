#import <Google/CloudMessaging.h>

#import <RCTBridgeModule.h>

@interface RCTGoogleCloudMessaging : NSObject<RCTBridgeModule, GGLInstanceIDDelegate, GCMReceiverDelegate>

// get singleton to make sure the same react native module
+ (RCTGoogleCloudMessaging *) getSingleton;
+ (void) initStatic;
+ (void) addNotification:(NSDictionary *)notification;

@property(nonatomic, strong) NSString* registrationToken;
@property(nonatomic, strong) NSData* deviceToken;

-(void) registerToken:(NSData*) deviceToken;

@end
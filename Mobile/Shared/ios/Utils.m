#include <uuid/uuid.h>
#import <AssetsLibrary/AssetsLibrary.h>
#import <UIKit/UIKit.h>

#import "Utils.h"

@implementation Utils

- (id)init
{
  self = [super init];
  if (self) {
    self.certUtils = [[CertUtils alloc] init];
  }
  return self;
}

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(timeUUID:(RCTPromiseResolveBlock)resolve :(RCTPromiseRejectBlock)reject)
{
  @autoreleasepool {
    uuid_t UUID;
    uuid_generate_time(UUID);
    
    resolve([[[NSUUID alloc] initWithUUIDBytes:UUID] UUIDString]);
  }
}

RCT_REMAP_METHOD(randomUUID, randomUUID:(RCTPromiseResolveBlock)resolve :(RCTPromiseRejectBlock)reject)
{
  @autoreleasepool {
    uuid_t UUID;
    uuid_generate_random(UUID);
    
    if (uuid_is_null(UUID)) {
      reject(@"uuid_err", @"unable to generate random UUID", NULL);
    } else {
      resolve([[[NSUUID alloc] initWithUUIDBytes:UUID] UUIDString]);
    }
  }
}

RCT_REMAP_METHOD(readImage, :(NSString*)uri :(RCTPromiseResolveBlock)resolve :(RCTPromiseRejectBlock)reject)
{
  // Create NSURL from uri
  NSURL *url = [[NSURL alloc] initWithString:uri];
  
  // Create an ALAssetsLibrary instance. This provides access to the
  // videos and photos that are under the control of the Photos application.
  ALAssetsLibrary *library = [[ALAssetsLibrary alloc] init];
  
  // Using the ALAssetsLibrary instance and our NSURL object open the image.
  [library assetForURL:url resultBlock:
   ^(ALAsset *asset) {
     
     // Create an ALAssetRepresentation object using our asset
     // and turn it into a bitmap using the CGImageRef opaque type.
     CGImageRef imageRef = [asset thumbnail];
     // Create UIImageJPEGRepresentation from CGImageRef
     NSData *imageData = UIImageJPEGRepresentation([UIImage imageWithCGImage:imageRef], 0.1);
     
     // Convert to base64 encoded string
     resolve([imageData base64EncodedStringWithOptions:0]);
   } failureBlock:^(NSError *error) {
     reject(@"uuid_err", @"unable to generate random UUID", error);
   }];
}

RCT_REMAP_METHOD(encrypt, encrypt:(NSString*)plainText :(RCTPromiseResolveBlock)resolve :(RCTPromiseRejectBlock)reject)
{
  [_certUtils encrypt:plainText
                     :^(NSString *encrypted)
   {
     resolve(encrypted);
   }
                     :^(NSString *type, NSString *msg)
   {
     reject(type, msg, NULL);
   }];
}

@end
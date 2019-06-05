#import <Security/Security.h>

typedef void(^onComplete)(NSString *encrypted);
typedef void(^onError)(NSString *err, NSString *msg);

@interface CertUtils : NSObject

@property SecKeyRef publicKey;
@property size_t keyBlockSize;

-(void)encrypt:(NSString*)plainText :(onComplete)onComplete :(onError)onError;

@end
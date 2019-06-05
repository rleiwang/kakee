#import <UIKit/UIKit.h>

#import "CertUtils.h"

@implementation CertUtils

- (id)init
{
  self = [super init];
  if (self) {
    self.publicKey = [self getPublicKeyRef];
    self.keyBlockSize = SecKeyGetBlockSize(self.publicKey);
  }
  return self;
}

-(void)encrypt:(NSString *)plainText :(onComplete)onComplete :(onError)onError
{
  NSData *plainTextData = [plainText dataUsingEncoding:NSUTF8StringEncoding];
  size_t plainTextLength = [plainTextData length];
  
  //If using PKCS1 Padding, else keyBlockSize
  size_t maxInputSize = self.keyBlockSize - 11;
  if (plainTextLength > maxInputSize) {
    onError(@"encrypt_err", @"data size is larger than max permitted!");
    return;
  }
  
  uint8_t *cipherTextBuf = malloc(sizeof(uint8_t) * self.keyBlockSize);
  memset(cipherTextBuf, 0, self.keyBlockSize);
  size_t cipherTextLen = self.keyBlockSize;
  
  OSStatus result = SecKeyEncrypt(self.publicKey, kSecPaddingPKCS1, (const uint8_t *)[plainTextData bytes],
                                  plainTextLength, cipherTextBuf, &cipherTextLen);
  
  if (result == errSecSuccess) {
    onComplete([[NSData dataWithBytes:cipherTextBuf length:cipherTextLen] base64EncodedStringWithOptions:NSDataBase64Encoding76CharacterLineLength]);
  } else {
    onError(@"encrypt_err", [NSString stringWithFormat:@"error detected: %d", (int) result]);
  }
  
  free(cipherTextBuf);
}

- (SecKeyRef)getPublicKeyRef
{
  NSString *resourcePath = [[NSBundle mainBundle] pathForResource:@"signed_cert" ofType:@"der"];
  NSData *certData = [NSData dataWithContentsOfFile:resourcePath];
  SecCertificateRef cert = SecCertificateCreateWithData(NULL, (CFDataRef)certData);
  SecKeyRef key = NULL;
  SecTrustRef trust = NULL;
  SecPolicyRef policy = NULL;
  
  if (cert != NULL) {
    policy = SecPolicyCreateBasicX509();
    if (policy) {
      if (SecTrustCreateWithCertificates((CFTypeRef)cert, policy, &trust) == noErr) {
        SecTrustResultType result;
        SecTrustEvaluate(trust, &result);
        
        //Check the result of the trust evaluation rather than the result of the API invocation.
        switch (result) {
          case kSecTrustResultProceed:
          case kSecTrustResultRecoverableTrustFailure:
          case kSecTrustResultUnspecified:
            key = SecTrustCopyPublicKey(trust);
            break;
        }
      }
    }
  }
  
  if (policy) {
    CFRelease(policy);
  }
  
  if (trust) {
    CFRelease(trust);
  }
  
  if (cert) {
    CFRelease(cert);
  }
  return key;
}

@end
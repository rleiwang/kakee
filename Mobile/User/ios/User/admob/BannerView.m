#import "RCTBridgeModule.h"
#import "UIView+React.h"
#import "RCTLog.h"

#import "BannerView.h"

@implementation BannerAdsView

-(id)init
{
  self = [super initWithFrame:CGRectZero];
  if (self)
  {
    self.delegate = self;
    self.rootViewController = [UIApplication sharedApplication].delegate.window.rootViewController;
  }
  return self;
}

-(void)layoutSubviews
{
  [super layoutSubviews ];
  if (self.adUnitID)
  {
    self.adSize = kGADAdSizeSmartBannerPortrait;
    [self loadRequest:[GADRequest request]];
  }
}

#pragma mark Ad Request Lifecycle Notifications

/// Tells the delegate that an ad request successfully received an ad. The delegate may want to add
/// the banner view to the view hierarchy if it hasn't been added yet.
- (void)adViewDidReceiveAd:(GADBannerView *)bannerView
{
  RCTLogInfo(@"adViewDidReceiveAd");
}

/// Tells the delegate that an ad request failed. The failure is normally due to network
/// connectivity or ad availablility (i.e., no fill).
- (void)adView:(GADBannerView *)bannerView didFailToReceiveAdWithError:(GADRequestError *)error
{
  RCTLogInfo(@"adView");
}

#pragma mark Click-Time Lifecycle Notifications

/// Tells the delegate that a full screen view will be presented in response to the user clicking on
/// an ad. The delegate may want to pause animations and time sensitive interactions.
- (void)adViewWillPresentScreen:(GADBannerView *)bannerView
{
  RCTLogInfo(@"adView");
  
}

/// Tells the delegate that the full screen view will be dismissed.
- (void)adViewWillDismissScreen:(GADBannerView *)bannerView
{
  RCTLogInfo(@"adViewWillDismissScreen");
}

/// Tells the delegate that the full screen view has been dismissed. The delegate should restart
/// anything paused while handling adViewWillPresentScreen:.
- (void)adViewDidDismissScreen:(GADBannerView *)bannerView
{
  RCTLogInfo(@"adViewDidDismissScreen");
}

/// Tells the delegate that the user click will open another app, backgrounding the current
/// application. The standard UIApplicationDelegate methods, like applicationDidEnterBackground:,
/// are called immediately before this method is called.
- (void)adViewWillLeaveApplication:(GADBannerView *)bannerView
{
  RCTLogInfo(@"adViewWillLeaveApplication");
}

@end
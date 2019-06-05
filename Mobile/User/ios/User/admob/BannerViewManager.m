#import "BannerViewManager.h"

@implementation BannerAdsManager

RCT_EXPORT_MODULE()

RCT_EXPORT_VIEW_PROPERTY(adUnitID, NSString);

- (UIView *)view
{
  return [[BannerAdsView alloc] init];
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

@end
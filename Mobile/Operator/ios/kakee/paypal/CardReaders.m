#import "RCTBridge.h"
#import "RCTEventDispatcher.h"

#import <PayPalHereSDK/PayPalHereSDK.h>
#import <PaypalHereSDK/PPHCardReaderManager.h>
#import <PayPalHereSDK/PPHCardReaderMetadata.h>

#import "CardReaders.h"

@implementation CardReaders

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

RCT_EXPORT_METHOD(upgrade)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [[PayPalHereSDK sharedCardReaderManager] beginUpgradeUsingSDKUIForReader:[[PayPalHereSDK sharedCardReaderManager] availableReaderOfType:ePPHReaderTypeChipAndPinBluetooth]
                                                           completionHandler:^(BOOL success, NSString *message)
     {
       [self sendEvent:@{@"type": @"upgrade",
                         @"status": [NSNumber numberWithBool:success],
                         @"message": message}];
     }];
  });
}

RCT_EXPORT_METHOD(showAllReaders:(RCTPromiseResolveBlock)resolve :(RCTPromiseRejectBlock)reject)
{
  @autoreleasepool {
    NSArray<PPHCardReaderMetadata *> *readers = [[PayPalHereSDK sharedCardReaderManager] availableReaders];
    if (readers)
    {
      NSMutableArray *output = [[NSMutableArray alloc] initWithCapacity:[readers count]];
      for (PPHCardReaderMetadata *reader in readers)
      {
        if (reader)
        {
          [output addObject:[self readerMetadataToDictionary:reader]];
        }
      }
      resolve([output copy]);
    }
    else
    {
      reject(@"no_readers", @"no_readers_msg", NULL);
    }
  }
}

RCT_EXPORT_METHOD(showActiveReader:(RCTPromiseResolveBlock)resolve :(RCTPromiseRejectBlock)reject)
{
  @autoreleasepool {
    PPHCardReaderMetadata *reader = [[PayPalHereSDK sharedCardReaderManager] activeReader];
    if (reader)
    {
      resolve([self readerMetadataToDictionary:reader]);
    }
    else
    {
      reject(@"no_readers", @"no_readers_msg", NULL);
    }
  }
}

@synthesize bridge = _bridge;

-(void) sendEvent:(NSDictionary *)event
{
  [self.bridge.eventDispatcher sendAppEventWithName:@"CardReaderEvent" body:event];
}

-(NSDictionary *) readerMetadataToDictionary:(PPHCardReaderMetadata *)reader
{
  NSString *batteryStatus = nil;
  int batteryLevel = 0;
  if (reader.batteryInfo)
  {
    batteryStatus = [self batteryStatusToString:reader.batteryInfo.status];
    batteryLevel = reader.batteryInfo.level;
  }
  return @{@"type": [self readerTypeToString:reader.readerType],
           @"name": reader.friendlyName ? reader.friendlyName : [NSNull null],
           @"family": reader.family ? reader.family : [NSNull null],
           @"protocol": reader.protocolName ? reader.protocolName : [NSNull null],
           @"modelNo": reader.modelNo ? reader.modelNo : [NSNull null],
           @"model": [self modelToString:reader.readerModel],
           @"serialNo": reader.serialNumber ? reader.serialNumber : [NSNull null],
           @"os": reader.osRevision ? reader.osRevision : [NSNull null],
           @"firmware": reader.firmwareRevision ? reader.firmwareRevision : [NSNull null],
           @"batteryStatus": batteryStatus ? batteryStatus : [NSNull null],
           @"batterLevel": [NSNumber numberWithInt:batteryLevel],
           @"cardIsInserted": [NSNumber numberWithBool:reader.cardIsInserted],
           @"isReadyToTransact": [NSNumber numberWithBool:reader.isReadyToTransact],
           @"upgradeIsAvailable": [NSNumber numberWithBool:reader.upgradeIsAvailable],
           @"upgradeIsReady": [NSNumber numberWithBool:reader.upgradeIsReady],
           @"upgradeIsManadatory": [NSNumber numberWithBool:reader.upgradeIsManadatory],
           @"upgradeIsInitialSetup": [NSNumber numberWithBool:reader.upgradeIsInitialSetup],
           @"batteryIsLow": [NSNumber numberWithBool:reader.batteryIsLow],
           @"batteryIsCritical": [NSNumber numberWithBool:reader.batteryIsCritical],
           @"isReadyForUpgrade": [NSNumber numberWithBool:reader.isReadyForUpgrade],
           @"batteryIsCharging": [NSNumber numberWithBool:reader.batteryIsCharging]};
}

-(NSString *)readerTypeToString:(PPHReaderType)readerType
{
  switch (readerType)
  {
    case ePPHReaderTypeUnknown:
      return @"Unknown";
    case ePPHReaderTypeAudioJack:
      return @"AudioJack";
    case ePPHReaderTypeDockPort:
      return @"DockPort";
    case ePPHReaderTypeChipAndPinBluetooth:
      return @"ChipAndPinBluetooth";
  }
}

-(NSString *)batteryStatusToString:(PPHReaderBatteryStatus)batteryStatus
{
  switch (batteryStatus)
  {
    case ePPHReaderBatteryStatusOnBattery:
      return @"normal";
    case ePPHReaderBatteryStatusCharging:
      return @"charging";
    case ePPHReaderBatteryStatusChargedConnectedToPower:
      return @"charged";
    case ePPHReaderBatteryStatusBatteryLow:
      return @"low";
  }
}

-(NSString *) modelToString:(PPHReaderModel)model
{
  switch (model) {
    case ePPHReaderModelUnknown:
      return @"unknown";
    case ePPHReaderModelMiuraM000:
      return @"MiuraM000";
    case ePPHReaderModelMiuraM003:
      return @"MiuraM003";
    case ePPHReaderModelMiuraM010:
      return @"MiuraM010";
    case ePPHReaderModelMagtekAudio:
      return @"MagtekAudio";
    case ePPHReaderModelRoamAudio:
      return @"RoamAudio";
    case ePPHReaderModelMagtekiDynamo:
      return @"MagtekiDynam";
  };
}

#pragma PPHCardReaderDelegate implementation

/*!
 * A potential reader has been found.
 * @param reader the reader that was found
 */
-(void)didFindAvailableReaderDevice: (PPHCardReaderMetadata *) reader
{
  [self sendEvent:@{@"type": @"found",
                    @"reader": [self readerMetadataToDictionary:reader]}];
}

/*!
 * This event will be triggered in cases where reader detection takes a while, such as for
 * the audio readers. It presents an opportunity to show UI indicating that you are "working on it"
 * @param reader the basic information about reader that is actively being "verified"
 */
-(void)didStartReaderDetection: (PPHCardReaderMetadata *) reader
{
  [self sendEvent:@{@"type": @"starting",
                    @"reader": [self readerMetadataToDictionary:reader]}];
}

/*!
 * A fully working reader was detected and is available
 * @param reader the reader that was detected
 */
-(void)didDetectReaderDevice: (PPHCardReaderMetadata *) reader
{
  [self sendEvent:@{@"type": @"ready",
                    @"reader": [self readerMetadataToDictionary:reader]}];
}

/*!
 * A reader device has been removed from the system
 * @param readerType the type of reader that was removed
 */
-(void)didRemoveReader:(PPHReaderType)readerType
{
  [self sendEvent:@{@"type": @"disconnected",
                    @"reader": @{@"type": [self readerTypeToString:readerType]}}];
}

/*!
 * Something has occurred in the read head of the reader. Since processing can take a second or so,
 * this allows you to get some UI up. Be careful how much work you do here because taxing the CPU
 * will hurt success rate.
 */
-(void)didDetectCardSwipeAttempt
{
  [self sendEvent:@{@"type": @"swipe"}];
}

/*!
 * A card swipe has succeeded
 * @param card Encrypted and masked data about the card
 */
-(void)didCompleteCardSwipe:(PPHCardSwipeData *)card
{
  [self sendEvent:@{@"type": @"complete"}];
}

/*!
 * A swipe attempt failed. Usually this means the magstripe could not be read and the merchant should try again.
 */
-(void)didFailToReadCard
{
  [self sendEvent:@{@"type": @"fail"}];
}

/*!
 * New or different information has been discovered about a reader and we have produced an updated metadata.
 * @param metadata the available data about the reader
 */
-(void)didReceiveCardReaderMetadata: (PPHCardReaderMetadata *)reader
{
  [self sendEvent:@{@"type": @"info",
                    @"reader": [self readerMetadataToDictionary:reader]}];
}

/*!
 * A new reader has been set as active and is now the only one eligible for payment.
 * @param previousReader the reader that was active
 * @param currentReader the reader that is active
 */
-(void)activeReaderChangedFrom: (PPHCardReaderMetadata *)previousReader
                            to: (PPHCardReaderMetadata *)currentReader
{
  [self sendEvent:@{@"type": @"active",
                    @"reader": [self readerMetadataToDictionary:currentReader]}];
}

/*!
 * A reader upgrade was successful
 * @param successful whether the upgrade succeeded
 * @param message Additional details about the upgrade (if it failed)
 */
-(void)didUpgradeReader:(BOOL)successful withMessage: (NSString*) message
{
  [self sendEvent:@{@"type": @"upgrade",
                    @"status": [NSNumber numberWithBool:successful],
                    @"message": message}];
}

/*!
 * Called when a card is that was inserted into the reader has been removed.
 */
-(void)didRemoveCard
{
  [self sendEvent:@{@"type": @"removed"}];
}

@end
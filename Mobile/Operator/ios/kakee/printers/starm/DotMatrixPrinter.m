#import <StarIO/SMBluetoothManager.h>

#import "DotMatrixPrinter.h"

@implementation DotMatrixPrinter

- (NSArray *) connectedBluetoothPrinters
{
  @try {
    for (EAAccessory *accessory in [EAAccessoryManager sharedAccessoryManager].connectedAccessories) {
      NSLog(@"connected bluetooth %@", accessory);
    }
  }
  @catch (NSException *exception) {
    NSLog(@"%@ excep", exception);
  }
  
  
  NSMutableArray *printers = @[].mutableCopy;
  
  for (PortInfo *portInfo in [SMPort searchPrinter:@"BT:"])
  {
    self.portInfo = portInfo;
    NSLog(@"%@ portInfo", portInfo);
    [self getPort:portInfo.portName];
    [printers addObject:portInfo.modelName];
  }
  
  return printers.copy;
}

- (void) print:(NSDictionary *)JSON
{
  [self sendToPrinter:[self convert:JSON]];
}

- (SMPort *) openPort
{
  SMPort *smPort = nil;
  int tries = -1;
  do
  {
    tries++;
    // line mode
    smPort = [SMPort getPort:self.portInfo.portName :@"" :10000];
  }
  while(smPort == nil && tries < 3);
  
  return smPort;
}

- (void) getPort:(NSString *)portName
{
  SMPort *smPort = nil;
  @try
  {
    smPort = [self openPort];
    
    if (smPort)
    {
      NSLog(@"%@ firmware", [smPort getFirmwareInformation]);
      
      StarPrinterStatus_2 status;
      [smPort getParsedStatus:&status :2];
      if (!status.offline)
      {
        NSLog(@"printer is online");
      }
    }
  }
  @catch (PortException *exception)
  {
    NSLog(@"exception %@", exception);
  }
  @finally
  {
    if (smPort)
    {
      [SMPort releasePort:smPort];
    }
  }
}

- (void) sendToPrinter:(NSData *)data
{
  SMPort *smPort = nil;
  @try
  {
    smPort = [self openPort];
    if (smPort == nil)
    {
      NSLog(@"error");
      return;
    }
    
    StarPrinterStatus_2 status;
    [smPort beginCheckedBlock:&status :2];
    if (status.offline == SM_TRUE)
    {
      return;
    }
    
    int dataLen = (int) data.length;
    
    /*
     struct timeval endTime;
     gettimeofday(&endTime, NULL);
     endTime.tv_sec += 30;
     */
    unsigned char buf[dataLen];
    
    [data getBytes:buf length:data.length];
    
    int totalAmountWritten = 0;
    while (totalAmountWritten < dataLen)
    {
      int remaining = dataLen - totalAmountWritten;
      int amountWritten = [smPort writePort:buf :totalAmountWritten :remaining];
      totalAmountWritten += amountWritten;
      
      /*
       timeout
       struct timeval now;
       gettimeofday(&now, NULL);
       if (now.tv_sec > endTime.tv_sec)
       {
       break;
       }
       */
    }
    
    if (totalAmountWritten < data.length)
    {
      // error
      return;
    }
    
    smPort.endCheckedBlockTimeoutMillis = 30000;
    [smPort endCheckedBlock:&status :2];
    if (status.offline == SM_TRUE) {
      return;
    }
  }
  @catch (PortException *exception)
  {
    NSLog(@"%@ log", exception);
    
  }
  @finally
  {
    if (smPort)
    {
      [SMPort releasePort:smPort];
    }
  }
}


- (NSData *) convert:(NSDictionary *)JSON
{
  //[commands appendData:[@"------------------------------------------\r\n" dataUsingEncoding:NSASCIIStringEncoding]];
  NSMutableData *commands = [NSMutableData data];
  
  for (NSString *header in [JSON objectForKey:@"headers"])
  {
    [commands appendData:[self formatHeader:header]];
  }
  [commands appendData:[self emptyLine]];
  
  for (NSDictionary *line in [JSON objectForKey:@"body"])
  {
    NSString *left = [line objectForKey:@"left"];
    NSString *mid = [line objectForKey:@"middle"];
    NSString *right = [line objectForKey:@"right"];
    if (left == nil && mid == nil && right == nil)
    {
      [commands appendData:[self emptyLine]];
    }
    else
    {
      [commands appendData:[self formatBody:left :mid :right]];
    }
  }
  
  for (NSString *footer in [JSON objectForKey:@"footers"])
  {
    [commands appendData:[self formatFooter:footer]];
  }
  
  // Cut -> ESC d 0/1/2/3
  unsigned char autocutCommand[] = {0x1b, 'd', PARTIAL_CUT_FEED};
  [commands appendBytes:autocutCommand length:3];
  
  return [NSData dataWithData:commands];
}

// line feed
const NSString *lf = @"\r\n";

// each line has 42 chars
const int width = 42;

-(NSData *)emptyLine
{
  return [[NSString stringWithFormat:@"%@", lf] dataUsingEncoding:NSASCIIStringEncoding];
}

// align center
-(NSData *)formatHeader:(NSString *)header
{
  if (header)
  {
    int length = (int) [header lengthOfBytesUsingEncoding:NSASCIIStringEncoding] ;
    
    int left = (width - MIN(width, length)) / 2;
    int right = MAX((width - left - length), 0);
    
    return [[NSString stringWithFormat:@"%*s%@%*s%@", left, " ", header, right, " ", lf]
            dataUsingEncoding:NSASCIIStringEncoding];
  }
  
  return [self emptyLine];
}

// the total line width is 42
// [left 5][space 1][middle 25][space 1][right 10]
-(NSData *)formatBody:(NSString *)left :(NSString *)middle :(NSString *)right
{
  if (!left)
  {
    left = @"";
  }
  int leftLen = MIN(5, (int)[left lengthOfBytesUsingEncoding:NSASCIIStringEncoding]);
  
  if (!middle)
  {
    middle = @"";
  }
  int midLen = MIN(25, (int)[middle lengthOfBytesUsingEncoding:NSASCIIStringEncoding]);
  
  if (!right)
  {
    right = @"";
  }
  int rightLen = (int) [right lengthOfBytesUsingEncoding:NSASCIIStringEncoding];
  
  return [[NSString stringWithFormat:@"%*@%*s%*@%*s%*s%*@%@", leftLen, left, MAX(1, 6 - leftLen), " ",
           25, middle, MAX(0, 25 - midLen), " ", MAX(1, 11 - rightLen), " ", 10, right, lf]
          dataUsingEncoding:NSASCIIStringEncoding];;
}

// align right
-(NSData *)formatFooter:(NSString *)footer
{
  if (footer)
  {
    int length = (int) [footer lengthOfBytesUsingEncoding:NSASCIIStringEncoding] ;
    
    int left = MAX(0, (width - length));
    
    return [[NSString stringWithFormat:@"%*s%@%@", left, " ", footer, lf]
            dataUsingEncoding:NSASCIIStringEncoding];
  }
  return [self emptyLine];
}

@end
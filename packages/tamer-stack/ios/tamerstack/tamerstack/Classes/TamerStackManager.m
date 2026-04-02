#import "TamerStackManager.h"

static NSTimeInterval const kAnimDuration = 0.22;

@interface TamerStackEntry : NSObject
@property(nonatomic, copy) NSString *screenId;
@property(nonatomic, strong) UIView *container;
@end

@implementation TamerStackEntry
@end

@interface TamerStackManager ()
@property(nonatomic, strong) NSMutableArray<TamerStackEntry *> *stack;
@property(nonatomic, weak) UIView *hostView;
@end

@implementation TamerStackManager

+ (instancetype)sharedInstance {
    static TamerStackManager *instance;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[TamerStackManager alloc] init];
        instance.stack = [NSMutableArray array];
    });
    return instance;
}

- (void)attachHostBesideLynxView:(UIView *)lynxView {
    if (self.hostView) return;
    UIView *superview = lynxView.superview;
    if (!superview) return;

    UIView *host = [[UIView alloc] initWithFrame:superview.bounds];
    host.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    host.userInteractionEnabled = YES;
    [superview addSubview:host];
    self.hostView = host;
}

- (void)detachHost {
    [self.hostView removeFromSuperview];
    self.hostView = nil;
    [self.stack removeAllObjects];
}

- (void)pushScreenWithId:(NSString *)screenId container:(UIView *)container {
    dispatch_async(dispatch_get_main_queue(), ^{
        UIView *host = self.hostView;
        if (!host) return;

        for (TamerStackEntry *e in self.stack) {
            if ([e.screenId isEqualToString:screenId]) return;
        }

        TamerStackEntry *entry = [[TamerStackEntry alloc] init];
        entry.screenId = screenId;
        entry.container = container;
        [self.stack addObject:entry];

        container.frame = host.bounds;
        container.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        if (container.superview != host) {
            [container removeFromSuperview];
            [host addSubview:container];
        }

        CGFloat width = host.bounds.size.width ?: UIScreen.mainScreen.bounds.size.width;
        container.transform = CGAffineTransformMakeTranslation(width, 0);
        [UIView animateWithDuration:kAnimDuration
                              delay:0
                            options:UIViewAnimationOptionCurveEaseInOut
                         animations:^{
            container.transform = CGAffineTransformIdentity;
        } completion:nil];
    });
}

- (void)popScreenWithId:(NSString *)screenId {
    dispatch_async(dispatch_get_main_queue(), ^{
        TamerStackEntry *entry = [self entryForId:screenId];
        if (!entry) return;

        UIView *container = entry.container;
        CGFloat width = container.superview.bounds.size.width ?: UIScreen.mainScreen.bounds.size.width;
        [UIView animateWithDuration:kAnimDuration
                              delay:0
                            options:UIViewAnimationOptionCurveEaseInOut
                         animations:^{
            container.transform = CGAffineTransformMakeTranslation(width, 0);
        } completion:^(BOOL finished) {
            [container removeFromSuperview];
            [self.stack removeObject:entry];
        }];
    });
}

- (void)removeScreenWithId:(NSString *)screenId {
    dispatch_async(dispatch_get_main_queue(), ^{
        TamerStackEntry *entry = [self entryForId:screenId];
        if (!entry) return;
        [entry.container removeFromSuperview];
        [self.stack removeObject:entry];
    });
}

- (nullable TamerStackEntry *)entryForId:(NSString *)screenId {
    for (TamerStackEntry *e in self.stack.reverseObjectEnumerator) {
        if ([e.screenId isEqualToString:screenId]) return e;
    }
    return nil;
}

@end

#import <Lynx/LynxComponentRegistry.h>
#import <Lynx/LynxNativeLayoutNode.h>
#import <Lynx/LynxPropsProcessor.h>
#import <Lynx/LynxUIKitAPIAdapter.h>
#import "TamerStackContainer.h"
#import "TamerStackElement.h"
#import "TamerStackManager.h"

// ---------------------------------------------------------------------------
#pragma mark - TamerStackShadowNode
// ---------------------------------------------------------------------------

@implementation TamerStackShadowNode

LYNX_LAZY_REGISTER_SHADOW_NODE("stack-screen")

- (instancetype)initWithSign:(NSInteger)sign tagName:(NSString *)tagName {
    if (self = [super initWithSign:sign tagName:tagName]) {
        self.hasCustomLayout = YES;
    }
    return self;
}

- (MeasureResult)customMeasureLayoutNode:(MeasureParam *)param
                          measureContext:(nullable MeasureContext *)context {
    [self.children enumerateObjectsUsingBlock:^(LynxShadowNode *obj, NSUInteger idx, BOOL *stop) {
        if ([obj isKindOfClass:[LynxNativeLayoutNode class]]) {
            CGRect screen = [TamerStackShadowNode screenBounds];
            MeasureParam *childParam = [[MeasureParam alloc]
                initWithWidth:screen.size.width - obj.style.computedMarginLeft - obj.style.computedMarginRight
                    WidthMode:LynxMeasureModeDefinite
                       Height:screen.size.height - obj.style.computedMarginTop - obj.style.computedMarginBottom
                   HeightMode:LynxMeasureModeDefinite];
            [(LynxNativeLayoutNode *)obj measureWithMeasureParam:childParam MeasureContext:context];
        }
    }];
    return (MeasureResult){CGSizeZero};
}

- (void)customAlignLayoutNode:(AlignParam *)param alignContext:(AlignContext *)context {
    [self.children enumerateObjectsUsingBlock:^(LynxShadowNode *obj, NSUInteger idx, BOOL *stop) {
        if ([obj isKindOfClass:[LynxNativeLayoutNode class]]) {
            AlignParam *alignParam = [[AlignParam alloc] init];
            [alignParam SetAlignOffsetWithLeft:0.f Top:0.f];
            [(LynxNativeLayoutNode *)obj alignWithAlignParam:alignParam AlignContext:context];
        }
    }];
}

+ (CGRect)screenBounds {
    UIWindow *window = [LynxUIKitAPIAdapter getKeyWindow];
    return window ? window.bounds : UIScreen.mainScreen.bounds;
}

@end

// ---------------------------------------------------------------------------
#pragma mark - TamerStackElement
// ---------------------------------------------------------------------------

@interface TamerStackElement ()
@property(nonatomic, strong) TamerStackContainer *stackContainer;
@property(nonatomic, copy) NSString *screenId;
@property(nonatomic, assign) BOOL screenVisible;
@end

@implementation TamerStackElement

LYNX_LAZY_REGISTER_UI("stack-screen")

- (UIView *)createView {
    TamerStackContainer *container = [[TamerStackContainer alloc] init];
    self.stackContainer = container;
    return container;
}

- (void)onNodeReady {
    [super onNodeReady];
    // Keep the element's own frame at zero — the stack container fills the screen independently.
    self.view.frame = CGRectZero;

    if (self.screenVisible) {
        [[TamerStackManager sharedInstance] pushScreenWithId:[self resolvedId]
                                                   container:self.stackContainer];
    }
}

LYNX_PROP_SETTER("screen-id", setScreenId, NSString *) {
    self.screenId = value;
}

LYNX_PROP_SETTER("visible", setVisible, BOOL) {
    if (value == self.screenVisible) return;
    self.screenVisible = value;
    if (value) {
        [[TamerStackManager sharedInstance] pushScreenWithId:[self resolvedId]
                                                   container:self.stackContainer];
    } else {
        [[TamerStackManager sharedInstance] popScreenWithId:[self resolvedId]];
    }
}

- (NSString *)resolvedId {
    return self.screenId ?: [NSString stringWithFormat:@"%ld", (long)self.sign];
}

- (BOOL)shouldHitTest:(CGPoint)point withEvent:(nullable UIEvent *)event {
    return NO;
}

- (BOOL)isOverlay {
    return YES;
}

- (void)dealloc {
    [[TamerStackManager sharedInstance] removeScreenWithId:[self resolvedId]];
}

@end

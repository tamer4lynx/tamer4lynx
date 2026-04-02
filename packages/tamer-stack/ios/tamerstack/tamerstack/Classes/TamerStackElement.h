#import <Lynx/LynxCustomMeasureShadowNode.h>
#import <Lynx/LynxUI.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * <stack-screen> shadow node — takes zero layout space; single child measured to screen bounds.
 */
@interface TamerStackShadowNode : LynxCustomMeasureShadowNode
@end

/**
 * <stack-screen> LynxUI element.
 *
 * Zero-size in the Lynx layout tree. Content is promoted into a TamerStackContainer
 * managed by TamerStackManager, enabling zero-bitmap native push/pop animations.
 */
@interface TamerStackElement : LynxUI <UIView *>
@end

NS_ASSUME_NONNULL_END

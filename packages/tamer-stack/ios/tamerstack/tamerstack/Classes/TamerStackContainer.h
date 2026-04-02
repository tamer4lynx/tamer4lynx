#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * UIView subclass that hosts the Lynx-rendered content for one <stack-screen>.
 * hitTest is overridden to dispatch to reverse subview order, matching LynxOverlayContainer.
 */
@interface TamerStackContainer : UIView
@end

NS_ASSUME_NONNULL_END

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Singleton managing the native view stack for <stack-screen> elements.
 *
 * A single UIView host is inserted as a sibling of the LynxView inside the
 * host window/VC. Each visible <stack-screen> pushes a container view onto
 * this host; hiding pops it with a slide animation. No bitmaps are captured.
 */
@interface TamerStackManager : NSObject

+ (instancetype)sharedInstance;

/**
 * Attach the host stack container next to the given LynxView.
 * Call this after the LynxView is added to its superview.
 */
- (void)attachHostBesideLynxView:(UIView *)lynxView;

/** Remove the host container and clear the stack. */
- (void)detachHost;

/** Push a screen container onto the stack with a slide-in animation. */
- (void)pushScreenWithId:(NSString *)screenId container:(UIView *)container;

/** Pop (slide out and remove) the screen with the given id. */
- (void)popScreenWithId:(NSString *)screenId;

/** Remove the screen immediately without animation. */
- (void)removeScreenWithId:(NSString *)screenId;

@end

NS_ASSUME_NONNULL_END

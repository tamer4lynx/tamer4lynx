#import "TamerStackContainer.h"

@implementation TamerStackContainer

- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event {
    NSEnumerator *enumerator = [self.subviews reverseObjectEnumerator];
    UIView *subview = nil;
    while ((subview = [enumerator nextObject])) {
        if (!subview.hidden) {
            CGPoint converted = [self convertPoint:point toView:subview];
            UIView *hit = [subview hitTest:converted withEvent:event];
            if (hit) return hit;
        }
    }
    return nil;
}

@end

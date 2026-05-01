<!-- 3ea759d6-879d-4fca-9308-c7f9a1d7d42b -->
---
todos:
  - id: "insets-route"
    content: "Route TamerInsetsModule iOS emissions through hostView.lynxContext and add active-instance guard + reset cache on attachHostView"
    status: pending
  - id: "insets-js-seed"
    content: "Don't seed tamer-insets JS shared state with all-zero getInsets/getKeyboard response"
    status: pending
  - id: "navscreen-gate"
    content: "Gate TamerNavScreenOverlay enter/exit transitions on real self.view.hidden visibility changes"
    status: pending
  - id: "verify"
    content: "Verify on Android then iOS: keyboard/insets update, nav-screen buttons no longer retrigger animation"
    status: pending
isProject: false
---

## 1. `packages/tamer-insets/ios/tamerinsets/tamerinsets/Classes/TamerInsetsModule.swift`

Route events through the attached `LynxView`, not `self.lynxContext`, so only the active JS runtime receives emissions regardless of how many module instances are alive (matches Android's `emitGlobalEvent` at `TamerInsetsModule.kt:242-260`).

- Replace `sendEvent(_:payload:)` body:

```swift
private func sendEvent(_ name: String, payload: String) {
    let params: [[String: Any]] = [["payload": payload]]
    DispatchQueue.main.async {
        let ctx: LynxContext? = {
            if let lv = TamerInsetsModule.hostView as? LynxView { return lv.getLynxContext() }
            return TamerInsetsModule.shared?.lynxContext
        }()
        ctx?.sendGlobalEvent(name, withParams: params)
    }
}
```

(Use whichever accessor the LynxView exposes — `lynxContext`/`getLynxContext()`; will verify at implementation time.)

- Gate keyboard handlers so only the instance whose context matches the attached host LynxView processes notifications (defensive, in case `hostView` isn't a `LynxView`):

```swift
@objc private func keyboardWillShow(_ n: Notification)   { guard isActiveInstance() else { return }; handleKeyboardNotification(n, forceVisible: true) }
@objc private func keyboardWillHide(_ n: Notification)   { guard isActiveInstance() else { return }; handleKeyboardNotification(n, forceVisible: false) }
@objc private func keyboardWillChange(_ n: Notification) { guard isActiveInstance() else { return }; handleKeyboardNotification(n, forceVisible: nil) }

private func isActiveInstance() -> Bool {
    if let lv = TamerInsetsModule.hostView as? LynxView {
        return lv.getLynxContext() === self.lynxContext
    }
    return TamerInsetsModule.shared === self
}
```

- Force a first emit after `attachHostView` even when values match cache: reset `lastTop = lastRight = lastBottom = lastLeft = -1` in `attachHostView` before calling `publishCurrentInsets()`. Mirrors Android's `resetCachedValues()` at `TamerInsetsModule.kt:91-98`.

- Add `NSLog` in `handleKeyboardNotification` printing `overlap`, `safeBottom`, `visible`, `hostView`, `window` so remaining simulator-specific cases surface in device log.

## 2. `packages/tamer-insets/src/index.ts`

Do not persist all-zero insets to `insetsShared`/globalThis on first `getInsets` callback — they stick until the next change and look stale. Only seed when at least one dimension is non-zero, otherwise rely on the `tamer-insets:change` bridge event:

```ts
NativeModules?.TamerInsetsModule?.getInsets?.((res: any) => {
  const data = parsePayload<Insets>(res)
  if (data && (data.top || data.bottom || data.left || data.right)) setInsetsShared(toInsets(data))
})
```

Same guard for the keyboard seeder (don't overwrite with `{visible:false,height:0}` unless that's actually a state change).

## 3. `packages/tamer-navigation/ios/tamernavigation/tamernavigation/Classes/TamerNavScreenOverlay.m`

Only run enter/exit transitions on real visibility transitions. In `onNodeReady`:

```objc
BOOL wasVisible = !self.view.hidden;
BOOL visibleChanged = wasVisible != self.visible;

if (visibleChanged) {
  LynxCustomEvent *event = [[LynxDetailEvent alloc] initWithName:self.visible ? @"showoverlay" : @"dismissoverlay"
                                                      targetSign:[self sign]
                                                          detail:nil];
  [self.context.eventEmitter dispatchCustomEvent:event];
}

if (self.visible) {
  self.view.hidden = NO;
  if (visibleChanged) { [self tamerNavApplyEnterTransition]; }
  [TamerNavOverlayGlobalManager syncOverlayActiveStates];
} else {
  [TamerNavOverlayGlobalManager syncOverlayActiveStates];
  if (visibleChanged && _tamerNavDidLayoutOnce && self.view.superview) {
    // existing exit animation block (unchanged)
  } else if (!wasVisible) {
    self.view.hidden = YES;
  }
}
_tamerNavDidLayoutOnce = YES;
```

This matches the Android overlay which only invokes `animateEnter()` inside `show()` (transition false→true) and `animateExit()` inside `dismiss()`.

## 4. Verify

- Build and run the dev-app on an Android device/emulator first (per repo rule): confirm no regression on keyboard, insets, and nav-screen.
- Then iOS simulator: confirm
  - `useKeyboard()` reports `{visible:true, height>0}` when focusing an `<input>` inside a nav-screen.
  - `useInsets()` reports non-zero top/bottom after initial load and remains stable through nav-screen pushes.
  - Button presses inside a nav-screen no longer replay the slide animation.

If keyboard still reports `{visible:false,height:0}` after the changes, the added `NSLog` output will identify whether notifications are firing and what `overlap`/`safeBottom` values iOS provides; we'll iterate from there rather than claim a fix.

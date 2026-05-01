<!-- 3ea759d6-879d-4fca-9308-c7f9a1d7d42b -->
---
todos:
  - id: "ios-stack-ui"
    content: "iOS: TamerNavStackUI + TamerNavStackShadowNode — UINavigationController child VC, diff children into setViewControllers: by screen-key"
    status: pending
  - id: "ios-screen-ui"
    content: "iOS: TamerNavStackScreenUI + TamerNavStackScreenShadowNode + TamerNavScreenViewController; reparent screen view into VC; install LynxEventHandler; implement stack-animation / stack-presentation / gesture-enabled / header-shown / status-bar-style; emit willAppear/didAppear/willDisappear/didDisappear/dismissed"
    status: pending
  - id: "ios-remove-overlay"
    content: "iOS: delete TamerNavOverlayGlobalManager, TamerNavScreenOverlay, TamerNavOverlayContainer and all zPosition / stack-order machinery"
    status: pending
  - id: "android-stack-container"
    content: "Android: TamerNavStackUI (FrameLayout with generateViewId) + FragmentManager plumbing via ContextUtils.getActivity; diff children into a single FragmentTransaction by screen-key"
    status: pending
  - id: "android-screen-fragment"
    content: "Android: TamerNavScreenFragment + TamerNavStackScreenUI; reparent AndroidView in onCreateView; OnBackPressedCallback per top screen; predictive back; dismissed event"
    status: pending
  - id: "android-remove-overlay"
    content: "Android: delete overlay/ package (TamerNavOverlayManager, TamerNavOverlayDialog, TamerNavOverlayHostView, TamerNavOverlayProxy, TamerNavScreenOverlayAnimator, TamerNavOverlayActiveAware) and TamerNavBehavior z-order code"
    status: pending
  - id: "element-types"
    content: "Update packages/tamer-navigation/src/index.ts: remove NavScreenProps/stack-order, add NavStackProps + NavStackScreenProps (no zIndex/stack-order/zPosition); update snapshot-seed for compiler registration; update lynx.ext.json and autolink entries"
    status: pending
  - id: "router-rewire"
    content: "tamer-router: render single <nav-stack> with one <nav-stack-screen> per entry (including root); drop stackZIndex/EXIT_DELAY/closingEntryId/scheduleCloseTop; wire binddismissed as pop source-of-truth"
    status: pending
  - id: "verify"
    content: "bun run build both packages, then verify Android-first (push/pop, hardware back, predictive back, scroll-view in screen, keyboard, insets, no animation retrigger on button press, root back policy), then iOS (same + swipe-back + modal + per-screen status bar)"
    status: pending
isProject: false
---
## Goals / Non-goals

- **Goal**: `<nav-stack>` + `<nav-stack-screen>` feel like `@react-navigation/native-stack` but with one Lynx bundle and one JS runtime (state preserved across pushes). Per-screen rendering isolation via native containers (UINavigationController / FragmentManager) so z-index cannot leak across stack frames.
- **Non-goal (per user)**: No `stack-order` / `zPosition` / `zIndex` / sibling-reordering for stack layering. Stacking is owned 100% by `UINavigationController.setViewControllers:` (iOS) and `FragmentTransaction` (Android). `<nav-stack-screen>` paints zero itself and never participates in Lynx's compositor sibling order.
- **Non-goal**: Ditching JSX. Screens are declared as JSX children of `<nav-stack>`. Reparenting is what prevents the overlay-style z-index conflicts, not imperative APIs.

## Core mechanic (how "JSX screens" avoids z-index conflicts)

```mermaid
flowchart TB
  subgraph LynxTree[Single LynxView render tree]
    NavStackUI["nav-stack LynxUI<br/>createView → UIView wrapping UINavigationController.view"]
    NS1["nav-stack-screen #1 LynxUI<br/>screen-key=home"]
    NS2["nav-stack-screen #2 LynxUI<br/>screen-key=details"]
    NavStackUI --> NS1
    NavStackUI --> NS2
  end

  subgraph Platform[UIKit / Android View tree]
    NavCtrl[UINavigationController]
    VC1["UIViewController(home)<br/>view = NS1.view (reparented)"]
    VC2["UIViewController(details)<br/>view = NS2.view (reparented)"]
    NavCtrl -->|viewControllers[0]| VC1
    NavCtrl -->|viewControllers[1]| VC2
  end

  NS1 -. "reparent UIView<br/>(Lynx still owns layout/props)" .-> VC1
  NS2 -. "reparent UIView<br/>(Lynx still owns layout/props)" .-> VC2
```

- `<nav-stack-screen>`'s Lynx measure returns `(0, 0)` — it never takes Lynx-layout space, mirroring how overlay works today.
- `<nav-stack-screen>.view` is removed from its Lynx parent in UIKit/ViewGroup terms and installed as the `view` (iOS) / content (Android) of a dedicated `UIViewController` / `Fragment`. Lynx still drives prop/layout updates through `LynxUIOwner`, but the view only appears on screen through the navigator. A z-index declared on a descendant of screen A cannot stack above / below descendants of screen B because they live in two isolated VC/Fragment view hierarchies that `UINavigationController` / `FragmentManager` composites independently.
- Push/pop is derived **by diffing children of `<nav-stack>`** (React-driven, by key) inside the native `onNodeReady` / `layoutFinish` — no JS imperative `navigator.push`, no `stack-order` prop, no manual sibling reorder.

## File changes

### Removed / deprecated

- `packages/tamer-navigation/ios/.../TamerNavOverlayGlobalManager.{h,m}` — global container + zPosition sort is the source of the class of bugs the user wants to avoid. Delete.
- `packages/tamer-navigation/ios/.../TamerNavScreenOverlay.{h,m}` — replaced by `TamerNavStackScreenUI`.
- `packages/tamer-navigation/ios/.../TamerNavOverlayContainer.{h,m}` — gone (no global pan gesture).
- `packages/tamer-navigation/android/.../overlay/TamerNavOverlay*.kt` — replaced by stack UI + fragments.
- `packages/tamer-navigation/src/index.ts` — remove `NavScreenProps` / `stack-order`. Replace with `NavStackProps` + `NavStackScreenProps`.

### New (iOS, `packages/tamer-navigation/ios/tamernavigation/tamernavigation/Classes/`)

- `TamerNavStackUI.{h,m}` — `LynxUI<UIView *>`, tag `nav-stack`. `createView` returns a bare `UIView` which the `UINavigationController.view` is added to (sized to `self.view.bounds`). The `UINavigationController` is added as a child VC of the nearest responder `UIViewController` found by walking `self.parent.view`'s responder chain (same technique used in current `TamerNavScreenOverlay.customViewController`). Diff children in `onNodeReady` into `setViewControllers:animated:` by `screen-key`.
- `TamerNavStackScreenUI.{h,m}` — `LynxUI<UIView *>`, tag `nav-stack-screen`. Overrides `- (BOOL)isOverlay { return YES; }` (confirmed hook at `LynxUI.m:295` — makes Lynx bypass parent clip/layout participation, same as today's overlay). Zero-size measure in shadow node. On first `onNodeReady`, allocates a `TamerNavScreenViewController` whose `view` is a `TamerNavScreenContainerView` (see below) into which `self.view` is moved via `removeFromSuperview` + `addSubview`. Reads props: `screen-key` (required, stable identity for diff), `stack-animation` (`default`|`slide_from_right`|`slide_from_bottom`|`fade`|`none`), `stack-presentation` (`push`|`modal`|`transparentModal`), `gesture-enabled`, `header-shown` (default `false`), `title`, `status-bar-style`. **No** `stack-order`, **no** `zPosition`, **no** `zIndex`.
- `TamerNavScreenContainerView.{h,m}` — minimal Lynx event bridge, **stripped version of `TamerNavOverlayContainer`**: keeps the `ensureEventHandler` pattern (`[[LynxEventHandler alloc] initWithRootView:self withRootUI:rootUI]` + `updateUiOwner:eventEmitter:` + `setGestureArenaManagerAndGetIndex:`) and the `hitTest:` override that calls `LynxEventHandler hitTest:` + `handleFocus:`; **removes** the `UIPanGestureRecognizer` + `UIScreenEdgePanGestureRecognizer` that caused `<scroll-view>` inside a nav-screen to be unresponsive. Swipe-back is handled by `UINavigationController.interactivePopGestureRecognizer`, not a Lynx-level pan gesture.
- `TamerNavScreenViewController.{h,m}` — thin UIVC, `loadView` sets `view = TamerNavScreenContainerView`. Forwards `viewWillAppear`/`viewDidAppear`/`viewWillDisappear`/`viewDidDisappear` to the owning `TamerNavStackScreenUI` as Lynx events `willAppear`/`didAppear`/`willDisappear`/`didDisappear`. When `self.isMovingFromParentViewController` or `self.isBeingDismissed` is true in `viewDidDisappear`, emits `dismissed` (source-of-truth for router pop after swipe-back). Implements `preferredStatusBarStyle` and `prefersHomeIndicatorAutoHidden` from props.
- `TamerNavStackShadowNode.{h,m}` — normal shadow node for `nav-stack` (owns a child-sized frame; children get `NativeLayoutNodeRef` measurement on `self` bounds — stack occupies its normal Lynx-layout rect, unlike individual screens).
- `TamerNavStackScreenShadowNode.{h,m}` — custom-measure shadow node, zero size (same trick as `TamerNavScreenShadowNode` today).

### New (Android, `packages/tamer-navigation/android/src/main/kotlin/com/nanofuxion/tamernavigation/stack/`)

- `TamerNavStackUI.kt` — `UIGroup<FrameLayout>`, tag `nav-stack`. `FrameLayout` gets a generated id (`View.generateViewId()`) and becomes the fragment container. Looks up host `FragmentActivity` via `ContextUtils.getActivity`; uses `activity.supportFragmentManager` (or a `childFragmentManager` from a host-provided router fragment if we need nested stacks later). Diff children in `afterPropsUpdated` / `onLayoutFinish` into a single `FragmentTransaction` (`replace`/`add`/`remove` + `show`/`hide`) keyed by stable tag `tamer-nav-stack::<nav-stack-sign>::<screen-key>`. Note: unlike the existing overlay which uses a `Dialog` (separate window), the stack fragments live in the activity's window, so there's no `TamerNavOverlayDialog` analogue.
- `TamerNavScreenFragment.kt` — `Fragment` that owns a `FrameLayout` container. In `onCreateView` locates the associated `<nav-stack-screen>`'s `AndroidView` via a static registry keyed by `screen-key` and reparents it (`removeView` from its Lynx parent → `addView` into the fragment's container). Registers a per-fragment `OnBackPressedCallback` with `requireActivity().onBackPressedDispatcher` when top; consumes → emits `dismissed` on the associated `TamerNavStackScreenUI` (so router pops). Forwards `onResume`/`onPause`/`onStart`/`onStop` → `willAppear`/`didAppear`/`willDisappear`/`didDisappear` events.
- `TamerNavStackScreenUI.kt` — `UIGroup<AndroidView>`, tag `nav-stack-screen`, zero-measure. `isOverlay()` returns `true` (same hook found at `LynxBaseUI.java:3373`). Holds a strong ref to its view and `screenKey`; registers itself in the static registry in `onInsertChild`/`onAttach` so the paired fragment can find and reparent it.
- `TamerNavStackBehavior.kt` — registers both new behaviors (returns two `Behavior` instances, or we expose two classes registered from `lynx.ext.json`).
- Predictive back (`BackEventCompat`) handled by `OnBackPressedCallback.handleOnBackStarted/Progressed/Cancelled` in the top fragment.

### JSX typings & React surface (`packages/tamer-navigation/src/index.ts`)

```typescript
export type NavStackProps = ViewProps & { children?: ReactNode }

export type NavStackAnimation =
  | 'default' | 'slide_from_right' | 'slide_from_bottom' | 'fade' | 'none'
export type NavStackPresentation = 'push' | 'modal' | 'transparentModal'

export type NavStackScreenProps = {
  'screen-key': string
  'stack-animation'?: NavStackAnimation
  'stack-presentation'?: NavStackPresentation
  'gesture-enabled'?: boolean
  'header-shown'?: boolean
  title?: string
  'status-bar-style'?: 'default' | 'light' | 'dark'
  bindwillappear?: (e: unknown) => void
  binddidappear?: (e: unknown) => void
  bindwilldisappear?: (e: unknown) => void
  binddiddisappear?: (e: unknown) => void
  binddismissed?: (e: unknown) => void
  children?: ReactNode
}
```

No `stack-order`, no `z-index` on either type.

### tamer-router rewire (`packages/tamer-router/src/router.tsx`)

- Drop `OverlayEntryScreen`, `EXIT_DELAY_MS`, `closingEntryId`, `scheduleCloseTop`, `stackOrderForOverlay`, `stackZIndex` plumbing.
- Render exactly one `<nav-stack>` with one `<nav-stack-screen screen-key={entry.id}>` per entry, **including the root**. Root is no longer a separate positioned `<view zIndex=-1>`.

```tsx
<nav-stack style={{ flex: 1 }}>
  {entries.map((entry) => (
    <nav-stack-screen
      key={entry.id}
      screen-key={entry.id}
      stack-animation="slide_from_right"
      binddismissed={() => onNativeDismissed(entry.id)}
    >
      <MemoizedEntryRenderer ... />
    </nav-stack-screen>
  ))}
</nav-stack>
```

- `back()` → `setEntries((prev) => prev.slice(0, -1))`. Native pop gesture / predictive back emits `dismissed`, which the router treats as a source-of-truth pop (reconciling JS entries if user swiped back).
- `push` stays React-state based (append entry). Native diff runs `pushViewController:` / `FragmentTransaction.replace` automatically.

### Lynx plugin registration

- `packages/tamer-navigation/lynx.ext.json` and the tamer-cli autolinker emit registrations for both `nav-stack` and `nav-stack-screen` behaviors (iOS `LYNX_LAZY_REGISTER_UI` + shadow, Android `TamerNavStackBehavior` returning two Behaviors).

## Edge cases handled

- **Scroll-view inside a screen** (the bug that started this): screen view is the root view of a `UIViewController` / `Fragment`, so the VC's default gesture routing applies. No custom pan gesture competes with the scroll view → scrolling works without any `cancelsTouchesInView` hack.
- **Keyboard / insets** (`tamer-insets`): insets follow the LynxView's window. Since we keep one LynxView, `TamerInsetsModule` sees the same host view, so the keyboard fix from the previous iteration still applies. Each `TamerNavScreenViewController` forwards `viewWillAppear`/`viewDidDisappear` → `isActiveInstance()` check still routes events to the live JS runtime.
- **Hardware back (Android)**: `OnBackPressedCallback` on top fragment wins over activity back → consumes, emits `dismissed`, router state pops. Root stack (`entries.length === 1`) respects `exitOnRootHardwareBack` unchanged.
- **Swipe-back (iOS)**: `interactivePopGestureRecognizer` enabled when top screen has `gesture-enabled !== false`.
- **No re-animation on prop update**: since push/pop is driven by diffing `screen-key` (not `visible`), an unrelated prop update on the top screen causes no transition. Fixes the original "button press re-animates" bug structurally.
- **Status bar per screen**: `TamerNavScreenViewController.preferredStatusBarStyle` reads `status-bar-style`; calls `setNeedsStatusBarAppearanceUpdate` on `viewWillAppear`.
- **Modal presentation**: `stack-presentation="modal"` → `presentViewController:` from top; `transparentModal` sets `modalPresentationStyle = .overFullScreen` + clear background.

## Verification order (Android first per workspace rule, then iOS)

1. `bun run build` in `packages/tamer-navigation` then `packages/tamer-router`.
2. Android: push/pop via router, hardware back, predictive back, `<scroll-view>` inside a pushed screen, keyboard on pushed screen, `useInsets()` still correct, button-press does not retrigger animation, root back respects `exitOnRootHardwareBack`.
3. iOS: same matrix + swipe-back gesture, modal presentation, status bar style change per screen.
4. Smoke-test example app pages that currently use `<nav-screen>` (router is the only consumer — no user-code migration needed beyond rebuild).
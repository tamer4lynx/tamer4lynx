# Tamer packages: insets, screen, app shell

Design notes for **tamer-insets**, **tamer-screen**, and **tamer-app-shell**.

---

## tamer-insets

Package for system insets and keyboard state. Exposes hooks and (optionally) native bridge so JS can react to safe area and keyboard.

### Hooks

**`useInsets()`**

Returns safe-area insets (status bar, notch, home indicator). Does **not** include keyboard.

```ts
interface Insets {
  top: number    // status bar + notch
  right: number
  bottom: number // home indicator / system gesture area
  left: number
}
```

- **Updates:** When rotation or system UI changes. Does **not** update when keyboard shows/hides (by design).
- **Source:** `WindowInsetsCompat` (Android) / safe area APIs (iOS), exposed to JS via native module or events.

**`useKeyboard()`**

Returns keyboard visibility and height.

```ts
interface KeyboardState {
  visible: boolean
  height: number  // px or vp
}
```

- **Updates:** In real time as the keyboard animates in/out.
- **Source:** Lynx already has keyboard events (e.g. Harmony `keyboardstatuschanged`, Android `KeyboardEvent`, iOS keyboard notifications). Subscribe and expose via this hook.

---

## tamer-screen

Layout primitives for full-screen content: safe areas and keyboard avoidance. Uses **tamer-insets** under the hood.

### Component naming (Lynx)

Lowercase, hyphenated, browser-like. Not React Native names.

| Component              | Lynx tag            |
|------------------------|---------------------|
| Screen container      | `<screen>`          |
| Safe area wrapper     | `<safe-area>`       |
| Keyboard avoidance    | `<avoid-keyboard>`  |

### Components

- **`<screen>`** – Root screen container (full layout area).
- **`<safe-area>`** – Wraps content and applies padding (or insets) so content stays below status bar, above home indicator, and clear of notches. Uses `useInsets()` (or native equivalent).
- **`<avoid-keyboard>`** – When the keyboard is visible, shifts its **entire contents** (padding, translation, or height) so the whole container stays above the keyboard. Does **not** track focus on a nested `<input>`; treats the full subtree as the avoidance target. Supports custom input areas (e.g. chat compose bar). Scroll-to-bottom or other scroll behavior is the **developer’s responsibility**.

---

## tamer-app-shell

App chrome: top bar and bottom tab bar. Uses **tamer-screen** / **tamer-insets** for insets (e.g. status bar height for AppBar).

### Component naming (Lynx)

| Component     | Lynx tag    |
|---------------|-------------|
| Top app bar   | `<app-bar>` |
| Bottom tabs   | `<tab-bar>` |

### Semantics

- **Bottom bar** in “app shell” means the **in-app tab bar** (e.g. Home, Search, Profile), **not** the system gesture area (swipe home / app switcher). The system gesture area is an **inset** and is handled by **tamer-insets** / **tamer-screen** (e.g. `<safe-area>`).
- **tamer-app-shell** = AppBar + TabBar (and similar chrome).
- **tamer-screen-space** = status bar, notch, home indicator, keyboard; no app chrome.

### Integration with tamer-router

- App shell wraps the router outlet (e.g. in `_layout.tsx`): `<screen>` → `<app-bar>` + `<Outlet />` + optional `<tab-bar>`.
- **tamer-router** drives native transitions; the shell stays in the layout. AppBar can use `useTamerRouter().canGoBack()` and `back()` for the back button.
- Per-route options (e.g. hide header, change title) via route config or `useLocation()`.

---

## References

- **react-native-paper** – AppBar (statusBarHeight, modes, elevated); translate to Lynx `<view>` + styles.
- **expo-system-ui** – Root background color, userInterfaceStyle (no insets).
- **expo-status-bar** – Status bar style/hidden/translucent; map to platform APIs (e.g. `WindowInsetsControllerCompat` on Android).
- **M3** – [Top app bar](https://m3.material.io/components/top-app-bar/specs), [Switch](https://m3.material.io/components/switch/specs), [components overview](https://m3.material.io/components).

---

## Summary

| Package          | Purpose                          | Key APIs / components                                      |
|------------------|----------------------------------|------------------------------------------------------------|
| **tamer-insets** | Insets + keyboard state in JS   | `useInsets()`, `useKeyboard()`                             |
| **tamer-screen** | Screen layout + safe area + KAV  | `<screen>`, `<safe-area>`, `<avoid-keyboard>`              |
| **tamer-app-shell** | App chrome                    | `<app-bar>`, `<tab-bar>`; integrates with tamer-router     |

**`<avoid-keyboard>`:** Container-level shift only; scroll behavior (e.g. scroll to focused input or to bottom in chat) is the developer’s responsibility.

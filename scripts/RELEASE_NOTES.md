# Tamer App v0.0.20 — First Release

Expo Go-style dev client for [Tamer4Lynx](https://github.com/tamer4lynx/tamer4lynx) / Lynx. Scan a QR or enter a URL from the Tamer CLI dev server (`t4l start`), attach to your project, and hot-reload Lynx bundles without rebuilding native code. Also connects directly to plain `rspeedy dev` servers.

## What's in this release

First public binary release of Tamer App. Prebuilt Android and iOS artifacts from `packages/tamer-dev-app@0.0.20`. Builds use debug-capable native config so Lynx DevTool, shake/long-press menus, and embedded dev-client features all work.

## What's new

- **iOS support** — simulator and unsigned device builds
- **Tamer icon** — white logo on black background, matching Android
- **App name** — shows as "Tamer App" on both platforms
- **Rspeedy compat** — scan or enter a `rspeedy dev` URL; bundle loads directly without `t4l start`
- **mDNS discovery** — auto-discovers `t4l start` servers on LAN (physical device only)
- **Recent servers** — with live status dots and swipe-to-delete
- **Native module compat checks** — alerts when project requires modules not in this build

## Artifacts

| File | Target | Notes |
| --- | --- | --- |
| `TamerDevApp-0.0.20.apk` | Android device/emulator | Debug-capable APK (`arm64-v8a`, `armeabi-v7a`) |
| `TamerDevApp-Simulator-0.0.20.zip` | iOS Simulator (arm64 + x86_64) | Unzip → `xcrun simctl install booted TamerDevApp.app` |
| `TamerDevApp-Device-Unsigned-0.0.20.zip` | iOS device (arm64) | Unsigned `.app` — sign with your Apple identity, see `SIGN-AND-INSTALL.txt` |

## Install

### Android
```sh
adb install TamerDevApp-0.0.20.apk
adb shell am start -n com.nanofuxion.tamerdevapp/.MainActivity
```

### iOS Simulator
```sh
unzip TamerDevApp-Simulator-0.0.20.zip
xcrun simctl install booted TamerDevApp.app
xcrun simctl launch booted com.nanofuxion.tamerdevapp
```

### iOS Device
Ships unsigned for portability. Sign with your own Apple Developer identity, embed a provisioning profile for `com.nanofuxion.tamerdevapp`, wrap as IPA, and install. Full steps in `SIGN-AND-INSTALL.txt` inside the zip.

## Using the app

1. Run `t4l start` in your Lynx project (or start `rspeedy dev`)
2. Open Tamer App on your device/simulator
3. Scan the QR or enter the server URL
4. Edit Lynx code — bundles hot-reload instantly

The About tab shows embedded dev-client version, app version, and Lynx SDK version.

## Bundle ID / Package Name

- iOS: `com.nanofuxion.tamerdevapp`
- Android: `com.nanofuxion.tamerdevapp`

## Source

- Framework + CLI: https://github.com/tamer4lynx/tamer4lynx
- Dev client (Lynx UI): `@tamer4lynx/tamer-dev-client` on npm
- Dev app source: `packages/tamer-dev-app/` in the framework repo

## Build from source

```sh
git clone https://github.com/tamer4lynx/tamer4lynx
cd tamer4lynx && npm install && npm run build
node scripts/release-binaries.mjs
```

## Created by

Nanofuxion — Jordan Miller
GitHub: https://github.com/tamer4lynx/tamer4lynx
Discord: https://discord.com/users/235301625659392001
Email: ramnadroj@gmail.com

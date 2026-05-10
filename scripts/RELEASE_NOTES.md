# Tamer Dev App Initial Release

Expo Go-style dev client for [Tamer4Lynx](https://github.com/tamer4lynx/tamer4lynx) / Lynx. Scan a QR from the Tamer CLI dev server, attach to your project, hot-reload Lynx bundles without building native code.

## What's in this release

This is the first public binary release of Tamer Dev App. It includes prebuilt Android and iOS app artifacts built from the `packages/tamer-dev-app` workspace at the version in this tag.

The builds intentionally use debug-capable native configurations so Lynx DevTool gates, shake/long-press developer actions, and the embedded dev-client workflow stay available.

## Artifacts

| File | Target | Notes |
| --- | --- | --- |
| `TamerDevApp-<version>.apk` | Android device | Debug-capable APK for `arm64-v8a` and `armeabi-v7a`. |
| `TamerDevApp-Simulator-<version>.zip` | iOS Simulator (arm64 + x86_64) | Unzip and `xcrun simctl install booted ./TamerDevApp.app`. |
| `TamerDevApp-Device-Unsigned-<version>.zip` | iOS device (arm64) | Unsigned `.app`. You sign with your own Apple identity — see `SIGN-AND-INSTALL.txt` inside the zip. |

## Install

### Android emulator
```sh
adb install TamerDevApp-<version>.apk
adb shell am start -n com.nanofuxion.tamerdevapp/.MainActivity
```

### iOS simulator
```sh
unzip TamerDevApp-Simulator-<version>.zip
xcrun simctl install booted ./TamerDevApp.app
xcrun simctl launch booted com.nanofuxion.tamerdevapp
```

### iOS device
The device build ships unsigned to keep the release portable. Re-sign with your own developer identity, embed a provisioning profile that matches `com.nanofuxion.tamerdevapp` (or rewrite the bundle id), wrap as IPA, install. Step-by-step in the bundled `SIGN-AND-INSTALL.txt`.

## Using the dev app

1. In your Lynx project run `tamer start`.
2. Open Tamer Dev App on the simulator/emulator/device.
3. Scan the QR shown in the CLI, or pick a recently seen server.
4. Edit your Lynx code — bundles hot-reload over the dev server.

The About page inside the app shows the embedded dev-client version, the native app version, the running Lynx SDK version, and a Created-by card linking to GitHub / Discord / email.

## Published npm packages

- `@tamer4lynx/cli`
- `@tamer4lynx/tamer-dev-app`
- `@tamer4lynx/tamer-dev-client`
- `@tamer4lynx/tamer-app-shell`
- `@tamer4lynx/tamer-system-ui`
- `@tamer4lynx/tamer-screen`
- `@tamer4lynx/tamer-linking`
- `@tamer4lynx/jiggle`

## Bundle id / package name

- iOS: `com.nanofuxion.tamerdevapp`
- Android: `com.nanofuxion.tamerdevapp`

## Source / framework

- Framework + CLI: https://github.com/tamer4lynx/tamer4lynx
- Dev client (Lynx UI bundled into this app): `@tamer4lynx/tamer-dev-client` on npm
- Dev app (this binary's source): `packages/tamer-dev-app/` in the framework repo

## Created by

Nanofuxion — Jordan Miller.
GitHub: https://github.com/tamer4lynx/tamer4lynx
Discord: https://discord.com/users/235301625659392001
Email: ramnadroj@gmail.com

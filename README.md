# Tamer4Lynx

A CLI tool for creating, linking, and bundling Lynx native extensions. Aligned with the [Lynx Autolink RFC](https://github.com/lynx-family/lynx/discussions/2653).

Inspired by [Expo](https://expo.dev) and [Expo Go](https://expo.dev/go).

**Standalone app generation** follows patterns from [Lynx Explorer](https://github.com/lynx-family/lynx/tree/develop/explorer), patched for Maven-based standalone builds (no monorepo required). See [lynx#695](https://github.com/lynx-family/lynx/issues/695) for context.

## Installation

Install globally to use from any project:

```bash
npm i -g tamer4lynx
```

Or from GitHub:

```bash
npm i -g tamer4lynx/tamer4lynx
```

Then run from your project directory (where `tamer.config.json` lives):

```bash
t4l init
t4l start
t4l android build --install
```

### Cloning with Submodules

This repo includes native modules and host templates as git submodules. Clone with:

```bash
git clone --recurse-submodules https://github.com/tamer4lynx/tamer4lynx.git
```

If you already have a clone:

```bash
git submodule update --init --recursive
```

Submodules include: `jiggle`, `lynxwebsockets`, `tamer-dev-app`, `tamer-dev-client`, `tamer-host`, `tamer-plugin`, `tamer-router`, and UI/platform packages.

Tamer4Lynx uses configuration files to manage your project.

### 1. Host Application (`tamer.config.json`)

Create this file in the root of your repository to define your main application's properties.

#### Quick Init (Recommended)

You can interactively generate your config file using:

```bash
t4l init
```
Or simply run:
```bash
t4l
```
If no arguments are provided, the CLI will launch the interactive setup.

The script will prompt for:
- Android app name
- Android package name
- Android SDK path (supports `~`, `$ENV_VAR`)
- Whether to use the same name and bundle ID for iOS as Android
- iOS app name and bundle ID (if not using Android values)
- Lynx project path (relative to project root, optional)

Example output:
```json
{
  "android": {
    "appName": "MyApp",
    "packageName": "com.example.myapp",
    "sdk": "~/Library/Android/sdk"
  },
  "ios": {
    "appName": "MyApp",
    "bundleId": "com.example.MyApp"
  },
  "lynxProject": "packages/example",
  "paths": {
    "androidDir": "android",
    "iosDir": "ios",
    "lynxBundleRoot": "dist",
    "lynxBundleFile": "main.lynx.bundle"
  }
}
```

**Dynamic Lynx discovery:** If `lynxProject` is omitted, Tamer4Lynx auto-discovers the Lynx project by scanning workspaces for `lynx.config.ts` or `@lynx-js/rspeedy`. Bundle output path is read from `lynx.config.ts` `output.distPath.root` when present.

---

### Asset Bundling

**Note:** To ensure assets like images are bundled into the app, import them with the `?inline` suffix. For example:
```js
import logo from './assets/lynx-logo.png?inline';
```
This will include the asset directly in your app bundle.

---

### Show Help & Version

```bash
t4l --help
t4l --version
```

### Documentation

The docs site lives at `packages/docs`. From the repo root:

```bash
cd packages/docs && bun run dev
```

Build: `bun run build`. Output: `doc_build/`.

---

### **Extension Commands (RFC-compliant)**

#### Create a Lynx Extension

```bash
t4l create
```

Scaffolds a new extension project with `lynx.ext.json`, Android/iOS native code, and optional Element/Service support.

#### Code Generation

```bash
t4l codegen
```

Run from an extension package root to generate code from `@lynxmodule` declarations in `.d.ts` files.

---

### **Android Commands**

#### Create a Host Android Project

```bash
t4l android create
```

#### Link Native Modules to Android

```bash
t4l android link
```

#### Bundle Native Modules for Android

```bash
t4l android bundle
```

#### Build with `--debug` or `--release`

Use `--debug` (default) for development builds or `--release` for production. Cannot use both.

```bash
t4l android build --debug --install
t4l android build --release
t4l ios build --debug --install
```

#### Build Dev App (when tamer-dev-client is installed)

Equivalent to `android build --target dev-app` or `ios build --target dev-app`:

```bash
t4l build-dev-app
t4l build-dev-app --install
```

---

### **iOS Commands**

#### Create a Host iOS Project

```bash
t4l ios create
```

#### Link Native Modules to iOS

```bash
t4l ios link
```

#### Bundle Native Modules for iOS

```bash
t4l ios bundle
```

---

### **Cross-Platform Linking**

```bash
# Link only iOS
t4l link --ios

# Link only Android
t4l link --android

# Silent mode (no logs)
t4l link --silent
```

---

## Automatic Linking on Install

For the best experience, add a `postinstall` script to your project's `package.json`:

```json
"scripts": {
  "postinstall": "t4l link --silent"
}
```

---

## Extension Configuration

Extensions are discovered via **lynx.ext.json** (RFC standard) or **tamer.json** (legacy).

### lynx.ext.json (recommended)

```json
{
  "platforms": {
    "android": {
      "packageName": "com.example.mymodule",
      "moduleClassName": "com.example.mymodule.MyModule",
      "sourceDir": "android"
    },
    "ios": {
      "podspecPath": "ios/mymodule",
      "moduleClassName": "MyModule"
    },
    "web": {}
  }
}
```

### tamer.json (legacy, still supported)

```json
{
  "android": {
    "moduleClassName": "com.my-awesome-module.MyAwesomeModule",
    "sourceDir": "android"
  },
  "ios": {
    "podspecPath": "ios/mymodule",
    "moduleClassName": "MyModule"
  }
}
```

---

## Roadmap

* [x] Fix iOS linking
* [x] lynx.ext.json support (RFC #2653)
* [x] create-lynx-extension command
* [x] codegen command
* [ ] Full codegen (Android Spec, iOS Spec, web)

---

## Native Module References

These modules are included as git submodules. Run `t4l link` after adding to your app.

| Package | Description |
|---------|-------------|
| [jiggle](https://github.com/tamer4lynx/jiggle) | Vibration/haptic |
| [lynxwebsockets](https://github.com/tamer4lynx/lynxwebsockets) | WebSocket native bridge |
| [tamer-host](https://github.com/tamer4lynx/tamer-host) | Production Lynx host templates |
| [tamer-dev-app](https://github.com/tamer4lynx/tamer-dev-app) | Dev app (QR scan, HMR) |
| [tamer-dev-client](https://github.com/tamer4lynx/tamer-dev-client) | Dev launcher UI, discovery |
| [tamer-plugin](https://github.com/tamer4lynx/tamer-plugin) | Rsbuild plugin middleman |
| [tamer-router](https://github.com/tamer4lynx/tamer-router) | File-based routing, Stack/Tabs |
| [tamer-icons](https://github.com/tamer4lynx/tamer-icons) | Icon fonts (Material, Font Awesome) |
| [tamer-insets](https://github.com/tamer4lynx/tamer-insets) | System insets, keyboard state |
| [tamer-system-ui](https://github.com/tamer4lynx/tamer-system-ui) | Status bar, navigation bar |
| [tamer-app-shell](https://github.com/tamer4lynx/tamer-app-shell) | AppBar, TabBar, Content layout |
| [tamer-text-input](https://github.com/tamer4lynx/tamer-text-input) | React TextInput |
| [tamer-auth](https://github.com/tamer4lynx/tamer-auth) | OAuth 2.0 / OIDC |
| [tamer-biometric](https://github.com/tamer4lynx/tamer-biometric) | Fingerprint, Face ID |
| [tamer-display-browser](https://github.com/tamer4lynx/tamer-display-browser) | Open URLs in system browser |
| [tamer-linking](https://github.com/tamer4lynx/tamer-linking) | Deep linking |
| [tamer-screen](https://github.com/tamer4lynx/tamer-screen) | SafeArea, Screen, AvoidKeyboard |
| [tamer-secure-store](https://github.com/tamer4lynx/tamer-secure-store) | Secure key-value storage |
| [tamer-transports](https://github.com/tamer4lynx/tamer-transports) | Fetch, WebSocket, EventSource polyfills |

The iOS autolinking feature runs `pod install` automatically.

---

## Examples

- [Example LynxJS project with Jiggle and Lynx-Websockets](https://github.com/tamer4lynx/tamer4lynx/tree/main/packages/example)
## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

## Support

If you find this tool helpful, consider supporting its development. 

<a href="https://ko-fi.com/nanofuxion"> <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi"> </a>
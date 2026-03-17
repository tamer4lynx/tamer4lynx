# Tamer4Lynx

A CLI tool for creating, linking, and bundling Lynx native extensions. Aligned with the [Lynx Autolink RFC](https://github.com/lynx-family/lynx/discussions/2653).

Inspired by [Expo](https://expo.dev) and [Expo Go](https://expo.dev/go).

**Standalone app generation** follows patterns from [Lynx Explorer](https://github.com/lynx-family/lynx/tree/develop/explorer), patched for Maven-based standalone builds (no monorepo required). See [lynx#695](https://github.com/lynx-family/lynx/issues/695) for context.

## Installation

All Tamer packages are published under the `@tamer4lynx` scope on npm. Install the CLI globally:

```bash
npm i -g @tamer4lynx/tamer4lynx
```

With pnpm or Bun:

```bash
pnpm add -g @tamer4lynx/tamer4lynx
bun add -g @tamer4lynx/tamer4lynx
```

Or from GitHub (run `npm uninstall -g @tamer4lynx/tamer4lynx` first if switching):

```bash
npm i -g tamer4lynx/tamer4lynx
```

Then run from your project directory (where `tamer.config.json` lives):

```bash
t4l init
t4l start
t4l android build --install
```

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

| Command | Flags | Description |
|---------|-------|-------------|
| `t4l android create` | `-t, --target <host\|dev-app>` | Create Android project. Default: `host`. |
| `t4l android link` | — | Link native modules to Gradle. Build runs this automatically. |
| `t4l android bundle` | `-t, --target`, `-d, --debug`, `-r, --release` | Build Lynx bundle and copy to assets. Runs autolink first. |
| `t4l android build` | `-i, --install`, `-t, --target`, `-e, --embeddable`, `-d, --debug`, `-r, --release` | Build APK. `--install` deploys to device. `--embeddable` outputs AAR to `embeddable/` for existing apps. |
| `t4l android sync` | — | Sync dev client files from tamer.config.json. |
| `t4l android inject` | `-f, --force` | Inject tamer-host templates. `--force` overwrites existing files. |

### **iOS Commands**

| Command | Flags | Description |
|---------|-------|-------------|
| `t4l ios create` | — | Create iOS project. |
| `t4l ios link` | — | Link native modules to Podfile. Build runs this automatically. |
| `t4l ios bundle` | `-t, --target`, `-d, --debug`, `-r, --release` | Build Lynx bundle and copy to iOS project. |
| `t4l ios build` | `-t, --target`, `-e, --embeddable`, `-i, --install`, `-d, --debug`, `-r, --release` | Build iOS app. `--install` deploys to simulator. |
| `t4l ios inject` | `-f, --force` | Inject tamer-host templates. `--force` overwrites existing files. |

### **Unified Build** (`t4l build`)

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--platform` | `-p` | `all` | `android`, `ios`, or `all` |
| `--target` | `-t` | `dev-app` | `host` (production) or `dev-app` (QR scan, HMR) |
| `--embeddable` | `-e` | — | Output to `embeddable/`: **AAR** (Android) + **CocoaPod** (iOS). Use with `--release`. |
| `--debug` | `-d` | default | Debug build |
| `--release` | `-r` | — | Release build (optimized) |
| `--install` | `-i` | — | Install to device/simulator after build |

### **Other Commands**

| Command | Flags | Description |
|---------|-------|-------------|
| `t4l add [packages...]` | — | Add @tamer4lynx packages. Future: version tracking (Expo-style). |
| `t4l add-core` | — | Add core packages (app-shell, screen, router, insets, transports, text-input, system-ui, icons). |
| `t4l start` | `-v, --verbose` | Dev server with HMR. `--verbose` shows native + JS logs. |
| `t4l link` | `-i, --ios`, `-a, --android`, `-s, --silent` | Link modules. `--ios`/`--android` limit to one platform. `--silent` for CI/postinstall. |
| `t4l autolink-toggle` | — | Toggle `autolink` in tamer.config.json (postinstall linking). |

See [Commands Reference](packages/docs/docs/commands.md) for full flag details.

---

## Automatic Linking on Install

For the best experience, add a `postinstall` script to your project's `package.json`:

```json
"scripts": {
  "postinstall": "t4l link --silent"
}
```

---

## Configuration

- **Project:** `tamer.config.json` — host app (Android/iOS identity, paths, dev server). Create with `t4l init`.
- **Component:** `tamer.config.ts` — Rsbuild plugins (routing, etc.). Used by tamer-plugin.
- **Extension:** `lynx.ext.json` — native module registration per platform. Lives in each extension package.

See [Configuration Reference](packages/docs/docs/docs/configuration.md) for field-by-field docs. lynx.ext.json follows the [Lynx Autolink RFC](https://github.com/lynx-family/lynx/discussions/2653); [contribute to the RFC](https://github.com/lynx-family/lynx/discussions/2653) if you want to help improve it.

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

Install from npm and run `t4l link` after adding to your app:

| Package | Install | Description |
|---------|---------|-------------|
| [@tamer4lynx/jiggle](https://www.npmjs.com/package/@tamer4lynx/jiggle) | `npm i @tamer4lynx/jiggle` | Vibration/haptic |
| [@tamer4lynx/lynxwebsockets](https://www.npmjs.com/package/@tamer4lynx/lynxwebsockets) | `npm i @tamer4lynx/lynxwebsockets` | WebSocket native bridge |
| [@tamer4lynx/tamer-host](https://www.npmjs.com/package/@tamer4lynx/tamer-host) | `npm i @tamer4lynx/tamer-host` | Production Lynx host templates |
| [tamer-dev-app](https://github.com/tamer4lynx/tamer-dev-app) | workspace | Dev app (QR scan, HMR) |
| [@tamer4lynx/tamer-dev-client](https://www.npmjs.com/package/@tamer4lynx/tamer-dev-client) | `npm i @tamer4lynx/tamer-dev-client` | Dev launcher UI, discovery |
| [@tamer4lynx/tamer-plugin](https://www.npmjs.com/package/@tamer4lynx/tamer-plugin) | `npm i @tamer4lynx/tamer-plugin` | Rsbuild plugin middleman |
| [@tamer4lynx/tamer-router](https://www.npmjs.com/package/@tamer4lynx/tamer-router) | `npm i @tamer4lynx/tamer-router` | File-based routing, Stack/Tabs |
| [@tamer4lynx/tamer-icons](https://www.npmjs.com/package/@tamer4lynx/tamer-icons) | `npm i @tamer4lynx/tamer-icons` | Icon fonts (Material, Font Awesome) |
| [@tamer4lynx/tamer-insets](https://www.npmjs.com/package/@tamer4lynx/tamer-insets) | `npm i @tamer4lynx/tamer-insets` | System insets, keyboard state |
| [@tamer4lynx/tamer-system-ui](https://www.npmjs.com/package/@tamer4lynx/tamer-system-ui) | `npm i @tamer4lynx/tamer-system-ui` | Status bar, navigation bar |
| [@tamer4lynx/tamer-app-shell](https://www.npmjs.com/package/@tamer4lynx/tamer-app-shell) | `npm i @tamer4lynx/tamer-app-shell` | AppBar, TabBar, Content layout |
| [@tamer4lynx/tamer-text-input](https://www.npmjs.com/package/@tamer4lynx/tamer-text-input) | `npm i @tamer4lynx/tamer-text-input` | React TextInput |
| [@tamer4lynx/tamer-auth](https://www.npmjs.com/package/@tamer4lynx/tamer-auth) | `npm i @tamer4lynx/tamer-auth` | OAuth 2.0 / OIDC |
| [@tamer4lynx/tamer-biometric](https://www.npmjs.com/package/@tamer4lynx/tamer-biometric) | `npm i @tamer4lynx/tamer-biometric` | Fingerprint, Face ID |
| [@tamer4lynx/tamer-display-browser](https://www.npmjs.com/package/@tamer4lynx/tamer-display-browser) | `npm i @tamer4lynx/tamer-display-browser` | Open URLs in system browser |
| [@tamer4lynx/tamer-linking](https://www.npmjs.com/package/@tamer4lynx/tamer-linking) | `npm i @tamer4lynx/tamer-linking` | Deep linking |
| [@tamer4lynx/tamer-screen](https://www.npmjs.com/package/@tamer4lynx/tamer-screen) | `npm i @tamer4lynx/tamer-screen` | SafeArea, Screen, AvoidKeyboard |
| [@tamer4lynx/tamer-secure-store](https://www.npmjs.com/package/@tamer4lynx/tamer-secure-store) | `npm i @tamer4lynx/tamer-secure-store` | Secure key-value storage |
| [@tamer4lynx/tamer-transports](https://www.npmjs.com/package/@tamer4lynx/tamer-transports) | `npm i @tamer4lynx/tamer-transports` | Fetch, WebSocket, EventSource polyfills |

The iOS autolinking feature runs `pod install` automatically.

---

## Examples

- [Example LynxJS project with Jiggle and Lynx-Websockets](https://github.com/tamer4lynx/tamer4lynx/tree/main/packages/example)
## Contributing

Contributions are welcome! To develop on Tamer4Lynx:

```bash
git clone https://github.com/tamer4lynx/tamer4lynx.git
cd tamer4lynx
npm install
```

Please feel free to submit issues or pull requests.

---

## Support

If you find this tool helpful, consider supporting its development. 

<a href="https://ko-fi.com/nanofuxion"> <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi"> </a>
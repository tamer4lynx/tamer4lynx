# Tamer4Lynx

A CLI tool for creating, linking, and bundling Lynx native extensions. Aligned with the [Lynx Autolink RFC](https://github.com/lynx-family/lynx/discussions/2653).

Inspired by [Expo](https://expo.dev) and [Expo Go](https://expo.dev/go).

**Standalone app generation** follows patterns from [Lynx Explorer](https://github.com/lynx-family/lynx/tree/develop/explorer), patched for Maven-based standalone builds (no monorepo required). See [lynx#695](https://github.com/lynx-family/lynx/issues/695) for context.

## Running the CLI from this repo

Node cannot execute `index.ts` directly (`import './src/android/create'` has no file extension). Use one of:

```bash
npm install
npm run build
node dist/index.js init
```

Or run the TypeScript entry with **tsx** (no build):

```bash
npm install
npm run cli -- init
# same as: npx tsx index.ts init
```

## Installation

All Tamer packages are published under the `@tamer4lynx` scope on npm. Install the CLI globally:

```bash
npm i -g @tamer4lynx/cli@latest
pnpm add -g @tamer4lynx/cli@latest
bun add -g @tamer4lynx/cli@latest
```

Or from GitHub (run `npm uninstall -g @tamer4lynx/cli` first if switching):

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

Commands use the form **`t4l <command> [target] [flags]`** so they stay consistent. Target is a platform (`ios`, `android`) or, for create, an extension type (`module`, `element`, `service`, `combo`).

### **Create** (`t4l create <target>`)

| Target | Flags | Description |
|--------|-------|-------------|
| `ios` | — | Create iOS project. |
| `android` | `-d, --debug` (default), `-r, --release` (dev-app) | Create Android project. |
| `module` | — | Create Lynx extension with native module only. |
| `element` | — | Create Lynx extension with custom element (JSX preserved). |
| `service` | — | Create Lynx extension with service only. |
| `combo` | — | Create Lynx extension with module + element + service. |

### **Build** (`t4l build <platform>`)

Builds your app. **Platform is required:** `ios` or `android` (one per command). Dev client (QR scan, HMR) is included with **debug** (`-d`) when `@tamer4lynx/tamer-dev-client` is installed; **release** (`-r`) builds without it.

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| platform | — | — | `ios` or `android` (required) |
| `--embeddable` | `-e` | — | Output to `embeddable/`. Use **`t4l build android --embeddable`**. |
| `--debug` | `-d` | default | Debug build with dev client |
| `--release` | `-r` | — | Release build without dev client |
| `--production` | `-p` | — | Signed production build |
| `--install` | `-i` | — | Install after build (iOS: simulator with `-d`, physical device only with `-p`) |
| `--ipa` | — | — | iOS only with `-p`: export IPA (`APP_STORE_CONNECT_*` env + team → App Store archive/export; else zip) |

Examples: `t4l build android -i`, `t4l build ios -r`, `t4l build ios -p --ipa`.

### **Link** (`t4l link [platform]`)

| Flag | Description |
|------|-------------|
| platform | `ios`, `android`, or `both` (default) |
| `-s, --silent` | For CI/postinstall (suppress output). |

### **Bundle** (`t4l bundle [platform]`)

Build Lynx bundle and copy to native project. Platform: `ios` | `android` (default: both). Flags: `-d, --debug`, `-r, --release`.

### **Inject** (`t4l inject <platform>`)

Inject tamer-host templates. Platform: `ios` | `android`. Use `-f, --force` to overwrite.

### **Sync** (`t4l sync [platform]`)

Sync dev client files from tamer.config.json. Only `android` is supported (default).

### **Other Commands**

| Command | Flags | Description |
|---------|-------|-------------|
| `t4l add [packages...]` | — | Add @tamer4lynx packages. |
| `t4l add-core` | — | Add core packages (app-shell, screen, router, insets, transports, system-ui, icons). |
| `t4l start` | `-v, --verbose` | Dev server with HMR. |
| `t4l autolink-toggle` | — | Toggle `autolink` in tamer.config.json. |

**Long-form options:** All flags support both short and long form (e.g. `-d` or `--debug`, `-r` or `--release`, `-i` or `--install`).

**Platform-first form:** `t4l android create`, `t4l android build -r`, `t4l ios link`, `t4l ios bundle`, etc.

See [Commands Reference](packages/docs/docs/reference/commands.md) for full flag details.

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

See [Configuration Reference](packages/docs/docs/guide/configuration.md) for field-by-field docs. lynx.ext.json follows the [Lynx Autolink RFC](https://github.com/lynx-family/lynx/discussions/2653); [contribute to the RFC](https://github.com/lynx-family/lynx/discussions/2653) if you want to help improve it.

## Extension Configuration

Extensions are discovered via **lynx.ext.json** (RFC standard) or **tamer.json** (flat format).

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

### tamer.json (flat format)

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

## Limitations

- **tamer-transports** — Fetch, WebSocket, and EventSource polyfills are not fully tested. Report issues on GitHub.
- **t4l add** — Does not yet track installed versions for compatibility (Expo-style). Planned for a future release.
- **tamer-router** — Designed for @lynx-js/react (Stack, Tabs, react-router). Other bindings (VueLynx, miso-lynx) can use native modules and tooling but not the router.
- **Host dependencies** — Networking (fetch), font loading, and native modules depend on the Lynx host implementation.
- **iOS development** — Requires macOS and Xcode for building and running.

---

## Roadmap

* [x] Fix iOS linking
* [x] lynx.ext.json support (RFC #2653)
* [x] create-lynx-extension command
* [x] codegen command
* [ ] Full codegen (Android Spec, iOS Spec, web)

---

## Native Module References

Install from npm (use `@prerelease` for latest) and run `t4l link` after adding to your app. Also: `pnpm add @tamer4lynx/<pkg>@prerelease` | `bun add @tamer4lynx/<pkg>@prerelease`

| Package | Install | Description |
|---------|---------|-------------|
| [@tamer4lynx/jiggle](https://www.npmjs.com/package/@tamer4lynx/jiggle) | `npm i @tamer4lynx/jiggle@prerelease` | Vibration/haptic |
| WebSocket (native) | — | Use [@tamer4lynx/tamer-transports](https://www.npmjs.com/package/@tamer4lynx/tamer-transports) (`@tamer4lynx/lynxwebsockets` is retired from this monorepo) |
| [@tamer4lynx/tamer-host](https://www.npmjs.com/package/@tamer4lynx/tamer-host) | `npm i @tamer4lynx/tamer-host@prerelease` | Production Lynx host templates |
| [@tamer4lynx/tamer-dev-client](https://www.npmjs.com/package/@tamer4lynx/tamer-dev-client) | `npm i @tamer4lynx/tamer-dev-client@prerelease` | Dev launcher UI (QR scan, HMR). Add to your app and build with `-d` for a dev build; `-r` omits it. |
| [@tamer4lynx/tamer-dev-app](https://www.npmjs.com/package/@tamer4lynx/tamer-dev-app) | workspace / npm | Standalone dev app (store build). Your app can use tamer-dev-client for dev builds instead. |
| [@tamer4lynx/tamer-plugin](https://www.npmjs.com/package/@tamer4lynx/tamer-plugin) | `npm i @tamer4lynx/tamer-plugin@prerelease` | Rsbuild plugin middleman |
| [@tamer4lynx/tamer-router](https://www.npmjs.com/package/@tamer4lynx/tamer-router) | `npm i @tamer4lynx/tamer-router@prerelease` | File-based routing, Stack/Tabs |
| [@tamer4lynx/tamer-icons](https://www.npmjs.com/package/@tamer4lynx/tamer-icons) | `npm i @tamer4lynx/tamer-icons@prerelease` | Icon fonts (Material, Font Awesome) |
| [@tamer4lynx/tamer-insets](https://www.npmjs.com/package/@tamer4lynx/tamer-insets) | `npm i @tamer4lynx/tamer-insets@prerelease` | System insets, keyboard state |
| [@tamer4lynx/tamer-system-ui](https://www.npmjs.com/package/@tamer4lynx/tamer-system-ui) | `npm i @tamer4lynx/tamer-system-ui@prerelease` | Status bar, navigation bar |
| [@tamer4lynx/tamer-app-shell](https://www.npmjs.com/package/@tamer4lynx/tamer-app-shell) | `npm i @tamer4lynx/tamer-app-shell@prerelease` | AppBar, TabBar, Content layout |
| [@tamer4lynx/tamer-auth](https://www.npmjs.com/package/@tamer4lynx/tamer-auth) | `npm i @tamer4lynx/tamer-auth@prerelease` | OAuth 2.0 / OIDC |
| [@tamer4lynx/tamer-biometric](https://www.npmjs.com/package/@tamer4lynx/tamer-biometric) | `npm i @tamer4lynx/tamer-biometric@prerelease` | Fingerprint, Face ID |
| [@tamer4lynx/tamer-display-browser](https://www.npmjs.com/package/@tamer4lynx/tamer-display-browser) | `npm i @tamer4lynx/tamer-display-browser@prerelease` | Open URLs in system browser |
| [@tamer4lynx/tamer-linking](https://www.npmjs.com/package/@tamer4lynx/tamer-linking) | `npm i @tamer4lynx/tamer-linking@prerelease` | Deep linking |
| [@tamer4lynx/tamer-screen](https://www.npmjs.com/package/@tamer4lynx/tamer-screen) | `npm i @tamer4lynx/tamer-screen@prerelease` | SafeArea, Screen, AvoidKeyboard |
| [@tamer4lynx/tamer-secure-store](https://www.npmjs.com/package/@tamer4lynx/tamer-secure-store) | `npm i @tamer4lynx/tamer-secure-store@prerelease` | Secure key-value storage |
| [@tamer4lynx/tamer-transports](https://www.npmjs.com/package/@tamer4lynx/tamer-transports) | `npm i @tamer4lynx/tamer-transports@prerelease` | Fetch, WebSocket, EventSource polyfills |

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
# or: pnpm install | bun install
```

Please feel free to submit issues or pull requests.

---

## Support

If you find this tool helpful, consider supporting its development. 

<a href="https://ko-fi.com/nanofuxion"> <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi"> </a>
# Tamer4Lynx

CLI and npm packages (`@tamer4lynx/*`) for [Lynx](https://lynxjs.org): routing, native UI, platform APIs, iOS/Android hosts. Aligned with the [Lynx Autolink RFC](https://github.com/lynx-family/lynx/discussions/2653).

**Docs:** [tamer4lynx.github.io](https://tamer4lynx.github.io) (or `cd packages/docs && bun run dev`)

## Install

```bash
npm i -g @tamer4lynx/cli@latest
# or: pnpm add -g @tamer4lynx/cli@latest | bun add -g @tamer4lynx/cli@latest
```

## Quick start

```bash
t4l init              # create tamer.config.json (interactive)
t4l add-core          # install routing, UI, host, navigation packages
t4l create ios        # scaffold iOS project
t4l create android    # scaffold Android project
t4l link              # wire native modules
t4l start             # dev server + QR
t4l build ios -d -i   # debug build → simulator
t4l build android -d -i
```

## Running from this repo (development)

```bash
bun install
bun run build         # outputs dist/index.js
node dist/index.js init
# or without build:
bun run cli -- init   # uses tsx directly
```

## Commands

```
t4l init                        Interactive config setup
t4l create ios|android|module|element|service|combo
t4l build <ios|android> [-d|-r|-p] [-i] [--ipa] [--embeddable]
t4l link [ios|android]          Wire native modules (runs pod install on iOS)
t4l bundle [ios|android]        Build Lynx bundle and copy to native project
t4l inject ios|android [-f]     Inject tamer-host templates
t4l sync [android]              Sync dev client files
t4l start [-v]                  Dev server with HMR
t4l add [packages...]           Add @tamer4lynx packages
t4l add-core                    Production stack: host, navigation, plugin, router,
                                app-shell, screen, insets, system-ui, icons, transports, env
t4l add-dev                     Dev stack: add-core + dev-client, dev-app, linking
t4l update                      Update all @tamer4lynx/* to latest published versions
t4l signing [ios|android]       Configure signing (interactive)
t4l autolink-toggle             Toggle postinstall autolink in tamer.config.json
t4l codegen                     Generate code from @lynxmodule declarations
```

**Build flags:** `-d` debug (dev client included if tamer-dev-client installed), `-r` release (no dev client, unsigned), `-p` production (signed). `-i` installs after build: simulator with `-d`, physical device with `-p`. `--ipa` exports IPA after `-p` build on iOS. `--embeddable` outputs embeddable artifacts (Android only).

**Platform-first form:** `t4l ios create`, `t4l android build -d -i`, etc.

## Configuration files

| File | Purpose |
|------|---------|
| `tamer.config.json` | Host app — Android/iOS identity, paths, dev server. Created by `t4l init`. |
| `tamer.config.ts` | Rsbuild plugins (tamer-router, tamer-env, etc.). Used by tamer-plugin. |
| `lynx.ext.json` | Per-extension native module registration. Follows the Lynx Autolink RFC. |

## Packages

Install with `t4l add <name>` or `t4l add-core` / `t4l add-dev`. Always run `t4l link` after adding packages.

### Core
| Package | Description |
|---------|-------------|
| `@tamer4lynx/tamer-host` | Host templates for iOS/Android — auto-installed by `t4l create` |
| `@tamer4lynx/tamer-navigation` | Native stack transport (`TamerNav` push/pop/dispatch) |
| `@tamer4lynx/tamer-plugin` | Rsbuild plugin that loads and merges `tamer.config` |
| `@tamer4lynx/tamer-router` | File-based routing, Stack/Tabs, `useBackHandler`, cross-spoke state bridge |
| `@tamer4lynx/tamer-app-shell` | AppBar, TabBar, Content navigation chrome |
| `@tamer4lynx/tamer-dev-client` | Dev launcher (QR scan, mDNS discovery, HMR, compatibility check) |
| `@tamer4lynx/tamer-dev-app` | Standalone dev launcher app |

### UI
| Package | Description |
|---------|-------------|
| `@tamer4lynx/tamer-screen` | Screen, SafeArea, AvoidKeyboard |
| `@tamer4lynx/tamer-insets` | Safe area insets and keyboard state |
| `@tamer4lynx/tamer-system-ui` | Status bar, nav bar, theme colors |
| `@tamer4lynx/tamer-icons` | Native `<icon>` element (Material Icons, Font Awesome) |

### Platform
| Package | Description |
|---------|-------------|
| `@tamer4lynx/tamer-transports` | Fetch, WebSocket, EventSource polyfills |
| `@tamer4lynx/tamer-local-storage` | Web `localStorage` API |
| `@tamer4lynx/tamer-auth` | OAuth 2.0 / PKCE |
| `@tamer4lynx/tamer-secure-store` | Secure key-value storage |
| `@tamer4lynx/tamer-biometric` | Biometric authentication |
| `@tamer4lynx/tamer-linking` | Deep linking |
| `@tamer4lynx/tamer-display-browser` | In-app browser for OAuth |
| `@tamer4lynx/tamer-webview` | Native WebView |
| `@tamer4lynx/jiggle` | Vibration/haptic |

### Tooling
| Package | Description |
|---------|-------------|
| `@tamer4lynx/tamer-env` | `.env` loading and `process.env` injection for Rspeedy |
| `@tamer4lynx/tamer-ambient-types` | Generated component type declarations (`.tamer/`) |

## Limitations

- `tamer-router` targets `@lynx-js/react` (Stack, Tabs, react-router). Other bindings (VueLynx, miso-lynx) can use native modules and tooling but not the router.
- `tamer-transports` polyfills are not fully tested across all hosts. Report issues.
- `t4l add` does not yet track installed version compatibility (Expo-style). Planned.
- iOS builds require macOS and Xcode.

## Contributing

```bash
git clone https://github.com/tamer4lynx/tamer4lynx.git
cd tamer4lynx
bun install
```

Issues and PRs welcome.

---

<a href="https://ko-fi.com/nanofuxion"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support on Ko-fi"></a>

# Changelog

All notable changes to Tamer4Lynx are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Version bumps (workspace; publish separately)

- `@tamer4lynx/cli` **0.0.18** · `@tamer4lynx/tamer-dev-app` **0.0.9** · `@tamer4lynx/tamer-dev-client` **0.0.21** · `@tamer4lynx/tamer-router` **0.0.4** · `@tamer4lynx/tamer-transports` **0.0.7** · `@tamer4lynx/tamer-local-storage` **0.0.2**

### Added

- **`@tamer4lynx/tamer-dev-client` — Lynx DevTool** — Android: `lynx-devtool` / `lynx-service-devtool` (debug classpath only) plus `LynxDevToolBootstrap`; iOS: `LynxDevtool` pod + `LynxService` `Devtool` subspec (via `t4l link`), `LynxInitProcessor` sets `lynxDebugEnabled` / `devtoolEnabled` / `logBoxEnabled` under `#if DEBUG` only. `GeneratedLynxExtensions.register()` calls the bootstrap when the package is linked. **Not active** for `t4l build` **`-r`** / **`-p`** (release/production).

### Changed

- **`@tamer4lynx/tamer-router`** — Re-exports **`useLocation`**, **`useNavigate`**, **`useOutlet`**, **`useParams`** from react-router (same pattern as **`Outlet`** / **`Slot`**).

- **`@tamer4lynx/tamer-dev-client`** — Removed direct **`react-router`** dependency; **`useLocation`** is imported from **`@tamer4lynx/tamer-router`**.

- **`@tamer4lynx/tamer-dev-app`** — `package.json` depends only on **`@tamer4lynx/tamer-dev-client`** (removed unused `@tamer4lynx/*` packages not required by **tamer-dev-client**’s JS sources). Autolink for the dev app now only wires native modules in that npm dependency tree (not every hoisted workspace package under root `node_modules`).

- **`t4l add-dev`** — Installs **tamer-dev-app**, **tamer-dev-client**, and **app-shell / icons / insets / plugin / router / screen / system-ui** explicitly so each is resolved to the **highest published semver** (same version-pinning goal as **`t4l add-core`** / **`t4l add`**, not only transitive installs).

- **`@tamer4lynx/tamer-dev-app` (Android)** — `gradle/libs.versions.toml`: **Lynx `3.6.0`**, **PrimJS `3.6.1`**, aligned with iOS pods and `t4l android create` / embeddable (was 3.3.1 / 2.12.0).

- **iOS CocoaPods** — Generated Podfiles (`t4l ios create`, dev-app sync) use `install! 'cocoapods', :incremental_installation => true, :generate_multiple_pod_projects => true` for faster incremental `pod install` (CocoaPods requires both options together).

- **`t4l build ios` (Debug)** — Passes `COMPILER_INDEX_STORE_ENABLE=NO` to `xcodebuild` to reduce indexing work on dev builds (Release unchanged).

- **`t4l build ios -p`** — Always builds for **iphoneos** (device), never the simulator. **`t4l build ios -p -i`** installs on a **connected physical device** via `xcrun devicectl` (first listed device) instead of the booted simulator. Debug **`t4l build ios -d -i`** is unchanged (simulator + `simctl`).

### Fixed

- **`t4l build ios -p` / `-r`** — `ios link` / autolink called `syncHostIos()` with no options, which **re-applied embedded dev host Swift** after bundle had already synced release mode. Autolink now receives `{ release, includeDevClient }` so production/release builds stay on the non–dev-client `ViewController` and do not log “embedded dev mode” after “controller files”. Dev-client Lynx bundle was already skipped in release; this fixes the misleading second sync and wrong native entry UI for store builds.

- **iOS host `ViewController.swift` (dev)** — use `SystemUIModule.statusBarStyleForHost` (not a non-existent `TamerPreferredStatusBar`), add `import tamersystemui`, and gate `viewRespectsSystemMinimumLayoutMargins` with `if #available(iOS 15.0, *)`. Same availability guard in `t4l ios create` template, dev-app VCs, `syncDevClient` embedded Swift, and `tamer-dev-client` iOS templates.

- **`@tamer4lynx/tamer-dev-client`** — include `scripts/rspeedy-build.mjs` in the published package (`files` listed `dist` but not `scripts`), so `npm run build` works when the package is installed under `node_modules` (e.g. `t4l build ios -d`).

- **CLI dependencies** — Declared `ink`, `react`, `ink-text-input`, `ink-select-input`, and `ink-spinner` so `node dist/index.js` works after `npm install` (they were missing from `package.json`).
- **`npm run cli`** — `tsx index.ts` for developing without a build; documented in README (Node cannot run `index.ts` directly because ESM requires extensioned paths).

- **`t4l init`** — wizard text fields no longer keep the previous step’s text when moving on (each step’s `TuiTextInput` is keyed so React remounts cleanly).

- **TS6310** — Rspeedy/`pnpm create rspeedy` scaffolds a tsconfig with project references whose referenced configs use `noEmit: true`. TypeScript rejects this with "Referenced project may not disable emit". `t4l init` and `t4l build` now flatten such tsconfigs into a single config before the Lynx bundle build, so new projects build successfully out of the box.

## [0.0.13] - 2026-03-20

### Changed

- **`@tamer4lynx/cli` 0.0.13** — release with submodule version bumps (docs, dev-app, dev-client, linking, router, secure-store, system-ui, transports).

## [0.0.12] - 2026-03-19

### Changed

- **`@tamer4lynx/tamer-dev-client`** (0.0.12) — `npm run build` uses `rspeedy build --config lynx.config.mjs` so Node 22+ does not load `lynx.config.ts` from `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`). Published `0.0.10` only shipped `lynx.config.ts`; the tarball now includes `lynx.config.mjs` only.
- **`t4l init`** — if `tsconfig.json` is strict JSON with trailing commas (common after formatters), patch the `include` array after stripping trailing commas before `}` / `]`.
- **`t4l add` / `t4l add-core`** — when no version is given, query **`npm view … versions`**, take the **highest semver** published, and install `pkg@that-version` (parallel per package). Falls back to `@prerelease` only if the registry query fails. Avoids relying on npm’s `latest` tag or a single dist-tag when they lag behind the newest publish.
- **`t4l link`** — now calls `syncHostIos` before autolinking, so generated Swift files (`ViewController.swift`, `ProjectViewController.swift`, etc.) are always overwritten with the current templates. Previously only `t4l build ios` / `t4l bundle ios` refreshed those files.
- **CLI** — `t4l --version` reads `package.json` at runtime (next to `dist/index.js` or repo root when using `index.ts`) so bumping the package version no longer requires a rebuild to fix stale embedded versions.

### Fixed

- **`@tamer4lynx/tamer-dev-client`** — Ship `lynx.config.mjs` instead of `lynx.config.ts` so `npm run build` / `rspeedy build` works when the package lives under `node_modules` on Node 22+ (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`). Aliases moved to `resolve.alias` for Rsbuild. Dependency ranges updated (`tamer-insets`, `tamer-system-ui`, `tamer-router`) so `^0.0.1` no longer pins npm to pre-0.0.2 line releases (caret on `0.0.x` only allows patch bumps within the same minor line).
- **iOS status bar** — Status bar icons now follow light/dark theme (dark on light background, light on dark). Host view controllers use `TamerPreferredStatusBar.style` (tamer-dev-client), which reads `SystemUIModule` via KVC when `statusBarStyleRawForHost` exists so older `tamersystemui` pods still compile (falls back to `.default` until the pod is updated).
- **App bar title** — Title and icon colors now theme-aware via `headerForegroundColor` (tamer-router, tamer-app-shell).
- **Dev client initial theme** — Connect page and input no longer flash dark styling in light mode before theme loads; `resolveTheme(null)` returns `LIGHT_FALLBACK`.

### Changed

- Retired `@tamer4lynx/lynxwebsockets` from the monorepo workspace; use `@tamer4lynx/tamer-transports` for WebSocket.
- `tamer-dev-app` ships `LynxInitProcessor.swift` with autolink placeholders only — run `t4l link` (or `npm run link:native` from `packages/tamer-dev-app` in this repo) before building iOS.
- **tamer-system-ui** — Exposes `@objc` `statusBarStyleRawForHost` for host status bar sync; static `statusBarStyleForHost` remains for direct use. Default status bar style is `.default` until JS sets it.
- **Docs** — Removed tamer-input/tamer-text-input; removed lynxwebsockets; packages index aligned with workspace.

## [0.0.2] - 2026-03-17

### Fixed

- `t4l init` — fix text duplication in input prompts on Windows PowerShell (readline `terminal: false`)
- Suppress punycode deprecation warning at process start
- `t4l start` — fix `spawn npm ENOENT` by detecting package manager (npm/pnpm/bun) from lockfiles
- `npm install -g` from git — skip build when dist exists to avoid esbuild ERR_MODULE_NOT_FOUND

## [0.0.1] - 2026-03-17

### Added

- CLI (`t4l`, `tamer`) — init, start, build, add, add-core, link, android/ios create/bundle/build
- `t4l init` — interactive tamer.config.json setup
- `t4l add [packages...]` — add @tamer4lynx packages (npm/pnpm/bun)
- `t4l add-core` — install core packages (app-shell, screen, router, insets, transports, system-ui, icons)
- `t4l build` — unified build (dev-app default, host, embeddable)
- `t4l start` — dev server with HMR and WebSocket
- Android/iOS create, link, bundle, build, inject
- `--embeddable` — AAR (Android) + CocoaPod (iOS) for existing apps
- lynx.ext.json support (Lynx Autolink RFC)
- `t4l create` — scaffold Lynx extension
- `t4l codegen` — generate from @lynxmodule declarations
- @tamer4lynx packages on npm (jiggle, tamer-*)
- Dev app with QR scan, discovery, HMR
- Docs site (packages/docs)

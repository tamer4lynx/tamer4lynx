# Changelog

All notable changes to Tamer4Lynx are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Fixed

- **iOS status bar** — Status bar icons now follow light/dark theme (dark on light background, light on dark). ViewControllers use `SystemUIModule.statusBarStyleForHost`; root ViewController in embedded dev mode syncs from `syncHost.ts`.
- **App bar title** — Title and icon colors now theme-aware via `headerForegroundColor` (tamer-router, tamer-app-shell).
- **Dev client initial theme** — Connect page and input no longer flash dark styling in light mode before theme loads; `resolveTheme(null)` returns `LIGHT_FALLBACK`.

### Changed

- Retired `@tamer4lynx/lynxwebsockets` from the monorepo workspace; use `@tamer4lynx/tamer-transports` for WebSocket.
- `tamer-dev-app` ships `LynxInitProcessor.swift` with autolink placeholders only — run `t4l link` (or `npm run link:native` from `packages/tamer-dev-app` in this repo) before building iOS.
- **tamer-system-ui** — `statusBarStyleForHost` is now public for host ViewControllers; default status bar style is `.default` until JS sets it.
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

# Troubleshooting: BackgroundSnapshot not found: view

## Error

```
loadCard failed Error: BackgroundSnapshot not found: view
Snapshot not found: view
```

Engine version: 3.2.

## Root cause

The built-in Lynx element `view` is not registered in the snapshot system. When ReactLynx renders `<view>`, it expects either:

- `snapshotManager.values` to contain `'view'`, or
- `snapshotCreatorMap['view']` to provide a creator

In a broken build, only `root`, `wrapper`, and `null` exist; `view`, `text`, `scroll-view`, etc. are missing.

## Fix: Align with the working example

The tamer4lynx `packages/example` app works. Align the e2ee project with it.

### 1. Use Rspeedy for the build

The build must be done with **Rspeedy**, not plain Rsbuild. Rspeedy wires the Lynx pipeline correctly.

**package.json** (e2ee):

```json
{
  "scripts": {
    "build": "rspeedy build"
  },
  "dependencies": {
    "@lynx-js/react": ">=0.112.0"
  },
  "devDependencies": {
    "@lynx-js/react-rsbuild-plugin": ">=0.10.0",
    "@lynx-js/rspeedy": ">=0.10.0"
  }
}
```

Tamer packages accept these ranges; you can use newer Lynx versions (e.g. ^0.12.10, ^0.13.5).

### 2. Lynx config

**lynx.config.ts** (or lynx.config.js):

```ts
import path from 'path'
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

export default {
  plugins: [
    pluginReactLynx({ engineVersion: '3.2' }),
  ],
}
```

- Export a plain object (`export default { ... }`), not `defineConfig(...)`.
- Use `source.alias` (not `resolve.alias`) if you have aliases.
- Ensure `pluginReactLynx` is present and configured.

### 3. Reference types

**src/rspeedy-env.d.ts**:

```ts
/// <reference types="@lynx-js/rspeedy/client" />
```

### 4. Entry point

Entry should use `@lynx-js/react` and render via `root`:

```ts
import { root } from '@lynx-js/react'

root.render(<App />)
```

### 5. tamer.config.json

If using `t4l start`, ensure `tamer.config.json` points at the Lynx project:

```json
{
  "lynxProject": ".",
  "paths": {
    "lynxBundleRoot": "dist",
    "lynxBundleFile": "main.lynx.bundle"
  }
}
```

## Verification

1. Run `rspeedy build` (or `t4l start`).
2. Inspect `dist/.rspeedy/main/main-thread.js` (if present).
3. Search for `snapshotCreatorMap` or `snapshotManager` and confirm entries for `view`, `text`, etc., or that built-in elements are handled.

If the error persists, compare `lynx.config.ts`, `package.json`, and build output with `packages/example` in this repo.

## Cross-project compatibility

Tamer packages support `@lynx-js/react` >=0.112.0, `@lynx-js/react-rsbuild-plugin` >=0.10.0, and `@lynx-js/rspeedy` >=0.10.0. Use the latest Lynx versions (as `pnpm create rspeedy` would pick); no downgrade is needed.

### Package dist format

`@tamer4lynx/tamer-screen`, `@tamer4lynx/tamer-icons`, and `@tamer4lynx/tamer-app-shell` publish dist with **preserved JSX** (`.jsx` files). Consumers using Rspeedy do not need source aliases; the Lynx transform processes the `.jsx` from `node_modules` during the build.

# @tamer4lynx/tamer-asset

Expo-style asset loading for Tamer/Lynx — JS runtime, React hooks, and native cache layer.

## Install

```bash
t4l add tamer-asset
t4l link
```

## Usage

### `Asset.fromModule(input)`

Synchronous constructor. Returns an `Asset` immediately; `width`/`height` may be undefined until `downloadAsync()`.

```ts
import { Asset } from '@tamer4lynx/tamer-asset';

const asset = Asset.fromModule({ uri: 'https://example.com/image.png', name: 'image', type: 'image/png', embedded: false });
await asset.downloadAsync(); // caches to native FS
console.log(asset.localUri, asset.width, asset.height);
```

### React hooks

```ts
import { useAsset, useAssets } from '@tamer4lynx/tamer-asset';

// single asset
const [asset, error] = useAsset({ uri: '...', name: 'photo', type: 'image/jpeg', embedded: false });

// multiple assets
const [assets, error] = useAssets([
  { uri: '...', name: 'a', type: 'image/png', embedded: false },
  { uri: '...', name: 'b', type: 'image/png', embedded: false },
]);
```

### Rspack/Rsbuild plugin

Adds a build-time asset manifest and inline asset rule. Used via the `tamer.config` export:

```ts
// tamer.config.ts
import pluginTamerAsset from '@tamer4lynx/tamer-asset/tamer.config';

export default {
  plugins: [pluginTamerAsset],
};
```

Or wire the pieces manually:

```ts
import { createTamerAssetManifestPlugin, appendInlineAssetRule } from '@tamer4lynx/tamer-asset/plugin';
```

## API

| Export | Description |
|--------|-------------|
| `Asset` | Class with `fromModule(input)`, `fromModuleSync(input)`, `downloadAsync()` |
| `resolveAssetSource(input)` | Resolve a `TamerAssetInput` to a `TamerAsset` |
| `loadAssets(inputs)` | Load and download an array of assets |
| `getManifest()` | Return the build-time asset manifest |
| `lookupManifestEntry(uri)` | Look up a manifest entry by URI |
| `nativeFetch(uri, hash?)` | Fetch asset to native cache, returns `{ localUri, width?, height? }` |
| `nativeProbe(uri)` | Probe native dimensions without caching |
| `nativeClearCache()` | Clear native asset cache |
| `useAsset(input)` | Hook: `[asset \| null, error \| null]` |
| `useAssets(inputs)` | Hook: `[assets \| null, error \| null]` |

## Types

```ts
type TamerAssetInput = string | { uri?: string; localUri?: string; name?: string; type?: string; hash?: string; width?: number; height?: number; embedded?: boolean };
type TamerAsset     = { uri: string; localUri: string; name: string; type: string; hash?: string; width?: number; height?: number; embedded: boolean };
```

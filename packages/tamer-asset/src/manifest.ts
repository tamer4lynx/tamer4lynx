import type { AssetManifest, AssetManifestEntry } from './types.js'

declare const __TAMER_ASSET_MANIFEST__: AssetManifest | undefined

let _manifest: AssetManifest | null = null

export function getManifest(): AssetManifest | null {
  if (_manifest) return _manifest
  try {
    if (typeof __TAMER_ASSET_MANIFEST__ !== 'undefined') {
      _manifest = __TAMER_ASSET_MANIFEST__
      return _manifest
    }
  } catch {
    // not injected
  }
  return null
}

export function lookupManifestEntry(uri: string): AssetManifestEntry | undefined {
  return getManifest()?.assets.find((a) => a.uri === uri || a.localPath === uri)
}

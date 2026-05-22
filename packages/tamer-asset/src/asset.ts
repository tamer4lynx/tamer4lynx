import { resolveAssetSource } from './resolveAssetSource.js'
import { lookupManifestEntry } from './manifest.js'
import { nativeFetch } from './native.js'
import type { TamerAsset, TamerAssetInput } from './types.js'

export class Asset implements TamerAsset {
  uri: string
  localUri: string
  name: string
  type: string
  hash?: string
  width?: number
  height?: number
  embedded: boolean
  downloaded: boolean = false

  constructor(source: TamerAsset) {
    this.uri = source.uri
    this.localUri = source.localUri
    this.name = source.name
    this.type = source.type
    this.hash = source.hash
    this.width = source.width
    this.height = source.height
    this.embedded = source.embedded
  }

  /**
   * Sync constructor — returns Asset immediately. width/height may be undefined until downloadAsync().
   * Checks manifest for pre-computed dimensions.
   */
  static fromModule(input: TamerAssetInput): Asset {
    const source = resolveAssetSource(input)
    if (!source) throw new TypeError('Asset.fromModule: expected non-empty asset input')
    const asset = new Asset(source)
    // enrich from build-time manifest if available
    const entry = lookupManifestEntry(source.uri)
    if (entry) {
      if (asset.width == null && entry.width != null) asset.width = entry.width
      if (asset.height == null && entry.height != null) asset.height = entry.height
      if (entry.localPath) asset.localUri = entry.localPath
    }
    return asset
  }

  /** Alias for fromModule — explicit sync naming kept in line with Expo convention. */
  static fromModuleSync(input: TamerAssetInput): Asset {
    return Asset.fromModule(input)
  }

  /**
   * Downloads the asset to local native FS cache (dev: from dev server with ETag, prod: from app bundle).
   * Populates localUri, width, height after resolution. Returns this for chaining.
   */
  async downloadAsync(): Promise<this> {
    if (this.downloaded) return this

    const result = await nativeFetch(this.uri, this.hash)
    this.localUri = result.localUri
    if (result.width != null) this.width = result.width
    if (result.height != null) this.height = result.height
    this.downloaded = true
    return this
  }

  static async loadAsync(input: TamerAssetInput | TamerAssetInput[]): Promise<Asset[]> {
    const items = Array.isArray(input) ? input : [input]
    return Promise.all(items.map((item) => Asset.fromModule(item).downloadAsync()))
  }
}

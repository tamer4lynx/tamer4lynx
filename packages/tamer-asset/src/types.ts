export type TamerAssetInput =
  | string
  | {
      uri?: string
      localUri?: string
      name?: string
      type?: string
      hash?: string
      width?: number
      height?: number
      embedded?: boolean
    }

export type TamerAsset = {
  uri: string
  localUri: string
  name: string
  type: string
  hash?: string
  width?: number
  height?: number
  embedded: boolean
}

export type AssetManifestEntry = {
  uri: string
  localPath?: string
  type: string
  size?: number
  hash?: string
  width?: number
  height?: number
  source?: string
}

export type AssetManifest = {
  version: number
  generatedBy: string
  assets: AssetManifestEntry[]
}

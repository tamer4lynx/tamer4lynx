import { Asset } from './asset.js'
import type { TamerAssetInput } from './types.js'

/** Vue / non-React async loader. Equivalent to useAssets but returns a promise. */
export async function loadAssets(inputs: TamerAssetInput[]): Promise<Asset[]> {
  return Asset.loadAsync(inputs)
}

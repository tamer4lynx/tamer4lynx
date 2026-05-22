import { useAssets } from './useAssets.js'
import type { Asset } from '../asset.js'

/**
 * Single-asset variant of useAssets.
 *
 * @example
 * const [asset, error] = useAsset('./logo.png')
 */
export function useAsset(path: string): [Asset | undefined, Error | undefined] {
  const [assets, error] = useAssets([path])
  return [assets?.[0], error]
}

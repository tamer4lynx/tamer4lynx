import { useState, useEffect } from '@lynx-js/react'
import { Asset } from '../asset.js'

/**
 * Load and cache assets by path strings. Bundler scans for literal string args
 * at build time and registers them in the manifest — dynamic strings will fail at build.
 *
 * @example
 * const [assets, error] = useAssets(['./logo.png', './hero.png'])
 */
export function useAssets(paths: string[]): [Asset[] | undefined, Error | undefined] {
  const [assets, setAssets] = useState<Asset[] | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)

  // Stable key: join sorted paths so order doesn't cause spurious rerenders
  const key = [...paths].sort().join('\0')

  useEffect(() => {
    let cancelled = false
    setAssets(undefined)
    setError(undefined)

    const load = async () => {
      try {
        const loaded = await Asset.loadAsync(paths)
        if (!cancelled) setAssets(loaded)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return [assets, error]
}

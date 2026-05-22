export type NativeFetchResult = {
  localUri: string
  width?: number
  height?: number
  mime?: string
  size?: number
  fromCache: boolean
}

export type NativeProbeResult = {
  width?: number
  height?: number
  mime?: string
  size?: number
}

type TamerAssetsNativeModule = {
  fetch(uri: string, hash: string | null, callback: (result: NativeFetchResult & { error?: string }) => void): void
  probe(localUri: string, callback: (result: NativeProbeResult & { error?: string }) => void): void
  clearCache(callback: (result?: { error?: string }) => void): void
}

function resolveNativeModule(): TamerAssetsNativeModule | null {
  try {
    // Lynx native module access — same pattern as other tamer modules
    const NativeModules =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).NativeModules ?? (globalThis as any).__lynx_NativeModules
    return (
      (NativeModules?.TamerAssets as TamerAssetsNativeModule | undefined) ??
      (NativeModules?.TamerAssetModule as TamerAssetsNativeModule | undefined) ??
      null
    )
  } catch {
    return null
  }
}

export function getNativeModule(): TamerAssetsNativeModule | null {
  return resolveNativeModule()
}

export async function nativeFetch(uri: string, hash?: string): Promise<NativeFetchResult> {
  const mod = getNativeModule()
  if (!mod) {
    // Web fallback: treat uri as already local
    return { localUri: uri, fromCache: false }
  }
  return new Promise((resolve, reject) => {
    mod.fetch(uri, hash ?? null, (result) => {
      if (result?.error) {
        reject(new Error(result.error))
        return
      }
      resolve(result)
    })
  })
}

export async function nativeProbe(localUri: string): Promise<NativeProbeResult> {
  const mod = getNativeModule()
  if (!mod) return {}
  return new Promise((resolve, reject) => {
    mod.probe(localUri, (result) => {
      if (result?.error) {
        reject(new Error(result.error))
        return
      }
      resolve(result)
    })
  })
}

export async function nativeClearCache(): Promise<void> {
  const mod = getNativeModule()
  if (!mod) return
  return new Promise((resolve, reject) => {
    mod.clearCache((result) => {
      if (result?.error) {
        reject(new Error(result.error))
        return
      }
      resolve()
    })
  })
}

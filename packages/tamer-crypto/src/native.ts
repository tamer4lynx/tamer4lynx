'background only'

import { bytesToBase64, base64ToBytes, u8ToArrayBuffer } from './base64.js'

export async function invokeNativeAsync(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const mod = typeof NativeModules !== 'undefined' ? NativeModules?.TamerCryptoModule : null
  if (!mod?.invokeAsync) {
    throw new Error('tamer-crypto: TamerCryptoModule.invokeAsync is not available')
  }
  const json = JSON.stringify(payload)
  return new Promise((resolve, reject) => {
    mod.invokeAsync(json, (resultJson: string) => {
      try {
        const r = JSON.parse(resultJson) as { ok?: boolean; error?: string; result?: Record<string, unknown> }
        if (r.ok && r.result) resolve(r.result)
        else reject(new Error(r.error ?? 'tamer_crypto_error'))
      } catch (e) {
        reject(e)
      }
    })
  })
}

export function hasNativeCrypto(): boolean {
  return typeof NativeModules !== 'undefined' && !!NativeModules?.TamerCryptoModule?.invokeAsync
}

export async function nativeGetRandomValues(length: number): Promise<Uint8Array> {
  const r = await invokeNativeAsync({ op: 'getRandomValues', length })
  const b64 = r.bytes as string
  return base64ToBytes(b64)
}

export async function nativeRandomUUID(): Promise<string> {
  const r = await invokeNativeAsync({ op: 'randomUUID' })
  return r.uuid as string
}

export async function nativeDigest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer> {
  const r = await invokeNativeAsync({
    op: 'digest',
    algorithm,
    data: bytesToBase64(data),
  })
  return u8ToArrayBuffer(base64ToBytes(r.digest as string))
}

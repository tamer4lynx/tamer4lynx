'background only'

import { base64ToBytes } from './base64.js'
import { hasNativeCrypto } from './native.js'
import { createSubtleCrypto } from './subtle.js'

export class TamerCrypto {
  private _subtle: SubtleCrypto | undefined

  get subtle(): SubtleCrypto {
    if (!this._subtle) this._subtle = createSubtleCrypto()
    return this._subtle
  }

  getRandomValues<T extends ArrayBufferView>(typedArray: T): T {
    const mod = typeof NativeModules !== 'undefined' ? NativeModules?.TamerCryptoModule : null
    if (mod?.getRandomValuesSync) {
      const b64 = mod.getRandomValuesSync(typedArray.byteLength)
      const bytes = base64ToBytes(b64)
      const dst = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength)
      dst.set(bytes.subarray(0, dst.length))
      return typedArray
    }
    const gc = globalThis.crypto
    if (gc && typeof gc.getRandomValues === 'function') {
      return gc.getRandomValues(typedArray)
    }
    throw new Error('tamer-crypto: getRandomValues unavailable')
  }

  randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
    const mod = typeof NativeModules !== 'undefined' ? NativeModules?.TamerCryptoModule : null
    if (mod?.randomUUIDSync) {
      return mod.randomUUIDSync() as `${string}-${string}-${string}-${string}-${string}`
    }
    const gc = globalThis.crypto
    if (gc && typeof gc.randomUUID === 'function') {
      return gc.randomUUID()
    }
    throw new Error('tamer-crypto: randomUUID unavailable')
  }

  timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.byteLength !== b.byteLength) {
      throw new Error('timingSafeEqual: length mismatch')
    }
    const gc = globalThis.crypto as Crypto & {
      timingSafeEqual?: (x: Uint8Array, y: Uint8Array) => boolean
    }
    if (typeof gc.timingSafeEqual === 'function') {
      return gc.timingSafeEqual(a, b)
    }
    let o = 0
    for (let i = 0; i < a.length; i++) o |= a[i]! ^ b[i]!
    return o === 0
  }
}

let _singleton: Crypto | undefined

export function getTamerCrypto(): Crypto {
  if (_singleton !== undefined) return _singleton
  if (hasNativeCrypto()) {
    _singleton = new TamerCrypto() as Crypto
    return _singleton
  }
  const gc = globalThis.crypto
  if (gc && typeof gc.getRandomValues === 'function' && gc.subtle) {
    _singleton = gc as Crypto
    return _singleton
  }
  _singleton = new TamerCrypto() as Crypto
  return _singleton
}

export function polyfillGlobalCrypto(): void {
  if (typeof globalThis.crypto === 'undefined') {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      enumerable: true,
      value: getTamerCrypto(),
    })
  }
}

const defaultCrypto = getTamerCrypto()
export default defaultCrypto

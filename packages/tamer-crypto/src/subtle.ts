'background only'

import { invokeNativeAsync, hasNativeCrypto } from './native.js'
import {
  bufferSourceToU8,
  bytesToBase64,
  base64ToBytes,
  u8ToArrayBuffer,
  toBase64Url,
  fromBase64Url,
} from './base64.js'
import { createTamerCryptoKey, getMaterial, type TamerCryptoKey } from './cryptoKey.js'

function notSupported(msg: string): Error {
  const e = new Error(msg)
  e.name = 'NotSupportedError'
  return e
}

function throwDataError(): never {
  const e = new Error('DataError')
  e.name = 'DataError'
  throw e
}

function throwInvalidAccess(): never {
  const e = new Error('InvalidAccessError')
  e.name = 'InvalidAccessError'
  throw e
}

function hashToNativeName(h: AlgorithmIdentifier): string {
  const n = typeof h === 'string' ? h : (h as { name: string }).name
  if (n === 'SHA-256' || n === 'SHA-384' || n === 'SHA-512') return n
  throw notSupported(`hash:${n}`)
}

function ensureUsages(key: CryptoKey, op: KeyUsage) {
  if (!key.usages.includes(op)) throwInvalidAccess()
}

export class TamerSubtleCrypto {
  async digest(algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> {
    const name =
      typeof algorithm === 'string'
        ? algorithm
        : (algorithm as { name: string }).name
    const u8 = bufferSourceToU8(data)
    const r = await invokeNativeAsync({
      op: 'digest',
      algorithm: name,
      data: bytesToBase64(u8),
    })
    return u8ToArrayBuffer(base64ToBytes(r.digest as string))
  }

  async encrypt(algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer> {
    const algo = algorithm as AesGcmParams | RsaOaepParams
    if ((algo as AesGcmParams).name === 'AES-GCM') {
      ensureUsages(key, 'encrypt')
      const m = getMaterial(key)
      if (m.t !== 'aes') throw new TypeError('wrong key type')
      const iv = bufferSourceToU8((algo as AesGcmParams).iv)
      const pt = bufferSourceToU8(data)
      const tagLength = (algo as AesGcmParams).tagLength ?? 128
      const aad = (algo as AesGcmParams).additionalData
      const payload: Record<string, unknown> = {
        op: 'aesGcmEncrypt',
        key: bytesToBase64(m.raw),
        iv: bytesToBase64(iv),
        plaintext: bytesToBase64(pt),
        tagLength,
      }
      if (aad !== undefined) payload.additionalData = bytesToBase64(bufferSourceToU8(aad))
      const r = await invokeNativeAsync(payload)
      return u8ToArrayBuffer(base64ToBytes(r.ciphertextAndTag as string))
    }
    if ((algo as RsaOaepParams).name === 'RSA-OAEP') {
      ensureUsages(key, 'encrypt')
      const m = getMaterial(key)
      if (m.t !== 'rsa-pub') throw new TypeError('wrong key type')
      const label = (algo as RsaOaepParams).label
      const payload: Record<string, unknown> = {
        op: 'rsaOaepEncrypt',
        publicKeySpki: bytesToBase64(m.spki),
        data: bytesToBase64(bufferSourceToU8(data)),
      }
      if (label !== undefined) payload.label = bytesToBase64(bufferSourceToU8(label))
      const r = await invokeNativeAsync(payload)
      return u8ToArrayBuffer(base64ToBytes(r.ciphertext as string))
    }
    throw notSupported(`encrypt:${(algo as { name?: string }).name}`)
  }

  async decrypt(algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer> {
    const algo = algorithm as AesGcmParams | RsaOaepParams
    if ((algo as AesGcmParams).name === 'AES-GCM') {
      ensureUsages(key, 'decrypt')
      const m = getMaterial(key)
      if (m.t !== 'aes') throw new TypeError('wrong key type')
      const iv = bufferSourceToU8((algo as AesGcmParams).iv)
      const tagLength = (algo as AesGcmParams).tagLength ?? 128
      const aad = (algo as AesGcmParams).additionalData
      const payload: Record<string, unknown> = {
        op: 'aesGcmDecrypt',
        key: bytesToBase64(m.raw),
        iv: bytesToBase64(iv),
        ciphertextAndTag: bytesToBase64(bufferSourceToU8(data)),
        tagLength,
      }
      if (aad !== undefined) payload.additionalData = bytesToBase64(bufferSourceToU8(aad))
      const r = await invokeNativeAsync(payload)
      return u8ToArrayBuffer(base64ToBytes(r.plaintext as string))
    }
    if ((algo as RsaOaepParams).name === 'RSA-OAEP') {
      ensureUsages(key, 'decrypt')
      const m = getMaterial(key)
      if (m.t !== 'rsa-priv') throw new TypeError('wrong key type')
      const label = (algo as RsaOaepParams).label
      const payload: Record<string, unknown> = {
        op: 'rsaOaepDecrypt',
        privateKeyPkcs8: bytesToBase64(m.pkcs8),
        data: bytesToBase64(bufferSourceToU8(data)),
      }
      if (label !== undefined) payload.label = bytesToBase64(bufferSourceToU8(label))
      const r = await invokeNativeAsync(payload)
      return u8ToArrayBuffer(base64ToBytes(r.plaintext as string))
    }
    throw notSupported(`decrypt:${(algo as { name?: string }).name}`)
  }

  async sign(algorithm: AlgorithmIdentifier, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer> {
    const algo = algorithm as HmacImportParams | EcdsaParams
    const u8 = bufferSourceToU8(data)
    if ((algo as HmacImportParams).name === 'HMAC') {
      ensureUsages(key, 'sign')
      const m = getMaterial(key)
      if (m.t !== 'hmac') throw new TypeError('wrong key type')
      const hash = hashToNativeName((algo as HmacImportParams).hash)
      const r = await invokeNativeAsync({
        op: 'hmac',
        hash,
        key: bytesToBase64(m.raw),
        data: bytesToBase64(u8),
      })
      return u8ToArrayBuffer(base64ToBytes(r.signature as string))
    }
    if ((algo as EcdsaParams).name === 'ECDSA') {
      ensureUsages(key, 'sign')
      const m = getMaterial(key)
      if (m.t !== 'ec-priv') throw new TypeError('wrong key type')
      const r = await invokeNativeAsync({
        op: 'ecdsaP256Sign',
        privateKeyPkcs8: bytesToBase64(m.pkcs8),
        data: bytesToBase64(u8),
      })
      return u8ToArrayBuffer(base64ToBytes(r.signature as string))
    }
    throw notSupported(`sign:${(algo as { name?: string }).name}`)
  }

  async verify(
    algorithm: AlgorithmIdentifier,
    key: CryptoKey,
    signature: BufferSource,
    data: BufferSource
  ): Promise<boolean> {
    const algo = algorithm as HmacImportParams | EcdsaParams
    const u8 = bufferSourceToU8(data)
    const sig = bufferSourceToU8(signature)
    if ((algo as HmacImportParams).name === 'HMAC') {
      ensureUsages(key, 'verify')
      const m = getMaterial(key)
      if (m.t !== 'hmac') throw new TypeError('wrong key type')
      const hash = hashToNativeName((algo as HmacImportParams).hash)
      const r = await invokeNativeAsync({
        op: 'hmac',
        hash,
        key: bytesToBase64(m.raw),
        data: bytesToBase64(u8),
      })
      const exp = base64ToBytes(r.signature as string)
      if (exp.length !== sig.length) return false
      let ok = 0
      for (let i = 0; i < exp.length; i++) ok |= exp[i]! ^ sig[i]!
      return ok === 0
    }
    if ((algo as EcdsaParams).name === 'ECDSA') {
      ensureUsages(key, 'verify')
      const m = getMaterial(key)
      if (m.t !== 'ec-pub') throw new TypeError('wrong key type')
      const r = await invokeNativeAsync({
        op: 'ecdsaP256Verify',
        publicKeySpki: bytesToBase64(m.spki),
        data: bytesToBase64(u8),
        signature: bytesToBase64(sig),
      })
      return r.valid === true
    }
    throw notSupported(`verify:${(algo as { name?: string }).name}`)
  }

  async generateKey(
    algorithm: AlgorithmIdentifier,
    extractable: boolean,
    keyUsages: readonly KeyUsage[]
  ): Promise<CryptoKeyPair | CryptoKey> {
    const algo = algorithm as AesKeyGenParams | HmacKeyGenParams | EcKeyGenParams | RsaHashedKeyGenParams
    if ((algo as AesKeyGenParams).name === 'AES-GCM' || (algo as AesKeyGenParams).name === 'AES-CTR') {
      const len = (algo as AesKeyGenParams).length
      if (len !== 128 && len !== 192 && len !== 256) throw notSupported('AES length')
      const r = await invokeNativeAsync({ op: 'generateKeyAes', length: len })
      const raw = base64ToBytes(r.keyBytes as string)
      return createTamerCryptoKey(
        'secret',
        extractable,
        { name: 'AES-GCM', length: len } as Algorithm,
        [...keyUsages],
        { t: 'aes', raw }
      ) as TamerCryptoKey
    }
    if ((algo as HmacKeyGenParams).name === 'HMAC') {
      const len = (algo as HmacKeyGenParams).length ?? 256
      const hash = hashToNativeName((algo as HmacKeyGenParams).hash)
      const r = await invokeNativeAsync({ op: 'generateKeyHmac', length: len })
      const raw = base64ToBytes(r.keyBytes as string)
      return createTamerCryptoKey(
        'secret',
        extractable,
        { name: 'HMAC', hash: { name: hash } as HashAlgorithmIdentifier } as Algorithm,
        [...keyUsages],
        { t: 'hmac', raw }
      ) as TamerCryptoKey
    }
    if ((algo as EcKeyGenParams).name === 'ECDSA') {
      const namedCurve = (algo as EcKeyGenParams).namedCurve
      if (namedCurve !== 'P-256') throw notSupported('ECDSA curve')
      const r = await invokeNativeAsync({ op: 'generateKeyEcdsaP256' })
      const privBytes = base64ToBytes(r.privateKeyPkcs8 as string)
      const pubBytes = base64ToBytes(r.publicKeySpki as string)
      const pubKey = createTamerCryptoKey(
        'public',
        extractable,
        { name: 'ECDSA', namedCurve: 'P-256' } as Algorithm,
        [...keyUsages.filter((u) => u === 'verify')],
        { t: 'ec-pub', spki: pubBytes }
      ) as TamerCryptoKey
      const privKey = createTamerCryptoKey(
        'private',
        extractable,
        { name: 'ECDSA', namedCurve: 'P-256' } as Algorithm,
        [...keyUsages.filter((u) => u === 'sign')],
        { t: 'ec-priv', pkcs8: privBytes }
      ) as TamerCryptoKey
      return { publicKey: pubKey, privateKey: privKey }
    }
    if ((algo as RsaHashedKeyGenParams).name === 'RSA-OAEP') {
      const modulusLength = (algo as RsaHashedKeyGenParams).modulusLength
      const r = await invokeNativeAsync({ op: 'generateKeyRsaOaep', modulusLength })
      const privBytes = base64ToBytes(r.privateKeyPkcs8 as string)
      const pubBytes = base64ToBytes(r.publicKeySpki as string)
      const pubKey = createTamerCryptoKey(
        'public',
        extractable,
        {
          name: 'RSA-OAEP',
          modulusLength,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: { name: 'SHA-256' },
        } as Algorithm,
        [...keyUsages.filter((u) => u === 'encrypt' || u === 'wrapKey')],
        { t: 'rsa-pub', spki: pubBytes }
      ) as TamerCryptoKey
      const privKey = createTamerCryptoKey(
        'private',
        extractable,
        {
          name: 'RSA-OAEP',
          modulusLength,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: { name: 'SHA-256' },
        } as Algorithm,
        [...keyUsages.filter((u) => u === 'decrypt' || u === 'unwrapKey')],
        { t: 'rsa-priv', pkcs8: privBytes }
      ) as TamerCryptoKey
      return { publicKey: pubKey, privateKey: privKey }
    }
    throw notSupported(`generateKey:${(algo as { name?: string }).name}`)
  }

  async deriveKey(
    algorithm: AlgorithmIdentifier,
    baseKey: CryptoKey,
    derivedKeyType: AlgorithmIdentifier,
    extractable: boolean,
    keyUsages: readonly KeyUsage[]
  ): Promise<CryptoKey> {
    const bits = await this.deriveBits(algorithm, baseKey, this.derivedKeyLength(derivedKeyType))
    const dk = derivedKeyType as AesDerivedKeyParams | HmacImportParams
    if ((dk as AesDerivedKeyParams).name === 'AES-GCM' || (dk as AesDerivedKeyParams).name === 'AES-CTR') {
      const len = (dk as AesDerivedKeyParams).length
      const raw = new Uint8Array(bits).slice(0, len / 8)
      return createTamerCryptoKey(
        'secret',
        extractable,
        { name: 'AES-GCM', length: len } as Algorithm,
        [...keyUsages],
        { t: 'aes', raw }
      ) as TamerCryptoKey
    }
    if ((dk as HmacImportParams).name === 'HMAC') {
      const raw = new Uint8Array(bits)
      return createTamerCryptoKey(
        'secret',
        extractable,
        { name: 'HMAC', hash: (dk as HmacImportParams).hash } as Algorithm,
        [...keyUsages],
        { t: 'hmac', raw }
      ) as TamerCryptoKey
    }
    throw notSupported('deriveKey:derivedKeyType')
  }

  private derivedKeyLength(derivedKeyType: AlgorithmIdentifier): number {
    const dk = derivedKeyType as AesDerivedKeyParams | HmacImportParams
    if ((dk as AesDerivedKeyParams).name === 'AES-GCM' || (dk as AesDerivedKeyParams).name === 'AES-CTR') {
      return (dk as AesDerivedKeyParams).length
    }
    if ((dk as HmacImportParams).name === 'HMAC') {
      const len = (dk as HmacImportParams).length
      if (typeof len === 'number') return len
      return 256
    }
    throw notSupported('derivedKeyLength')
  }

  async deriveBits(algorithm: AlgorithmIdentifier, baseKey: CryptoKey, length: number): Promise<ArrayBuffer> {
    const algo = algorithm as Pbkdf2Params | HkdfParams
    if ((algo as Pbkdf2Params).name === 'PBKDF2') {
      const m = getMaterial(baseKey)
      if (m.t !== 'pbkdf2') throw new TypeError('base key must be PBKDF2')
      const hash = hashToNativeName((algo as Pbkdf2Params).hash)
      const salt = bufferSourceToU8((algo as Pbkdf2Params).salt)
      const iterations = (algo as Pbkdf2Params).iterations
      const r = await invokeNativeAsync({
        op: 'pbkdf2',
        hash,
        password: bytesToBase64(m.raw),
        salt: bytesToBase64(salt),
        iterations,
        length: (length + 7) >> 3,
      })
      const out = base64ToBytes(r.derived as string)
      return u8ToArrayBuffer(out.slice(0, (length + 7) >> 3))
    }
    if ((algo as HkdfParams).name === 'HKDF') {
      const m = getMaterial(baseKey)
      if (m.t !== 'hkdf') throw new TypeError('base key must be HKDF')
      const hash = hashToNativeName((algo as HkdfParams).hash)
      const salt = (algo as HkdfParams).salt
      const info = bufferSourceToU8((algo as HkdfParams).info)
      const saltBytes = salt ? bufferSourceToU8(salt) : new Uint8Array(0)
      const r = await invokeNativeAsync({
        op: 'hkdf',
        hash,
        ikm: bytesToBase64(m.raw),
        salt: bytesToBase64(saltBytes),
        info: bytesToBase64(info),
        length: (length + 7) >> 3,
      })
      const out = base64ToBytes(r.derived as string)
      return u8ToArrayBuffer(out.slice(0, (length + 7) >> 3))
    }
    throw notSupported(`deriveBits:${(algo as { name?: string }).name}`)
  }

  async importKey(
    format: KeyFormat,
    keyData: BufferSource | JsonWebKey,
    algorithm: AlgorithmIdentifier,
    extractable: boolean,
    keyUsages: readonly KeyUsage[]
  ): Promise<CryptoKey> {
    if (format === 'jwk') {
      const jwk = keyData as JsonWebKey
      if (jwk.kty === 'oct' && jwk.k) {
        const raw = fromBase64Url(jwk.k)
        const alg = algorithm as AesKeyAlgorithm | HmacImportParams
        if ((alg as AesKeyAlgorithm).name === 'AES-GCM') {
          const len = (alg as AesKeyAlgorithm).length
          if (raw.length * 8 !== len) throwDataError()
          return createTamerCryptoKey(
            'secret',
            extractable,
            { name: 'AES-GCM', length: len } as Algorithm,
            [...keyUsages],
            { t: 'aes', raw }
          ) as TamerCryptoKey
        }
        if ((alg as HmacImportParams).name === 'HMAC') {
          return createTamerCryptoKey(
            'secret',
            extractable,
            { name: 'HMAC', hash: (alg as HmacImportParams).hash } as Algorithm,
            [...keyUsages],
            { t: 'hmac', raw }
          ) as TamerCryptoKey
        }
      }
      throw notSupported('importKey:jwk')
    }
    const u8 = bufferSourceToU8(keyData as BufferSource)
    if (format === 'raw') {
      const algo = algorithm as AesKeyAlgorithm | HmacImportParams | Pbkdf2Params | HkdfParams
      if ((algo as AesKeyAlgorithm).name === 'AES-GCM' || (algo as AesKeyAlgorithm).name === 'AES-CTR') {
        const len = (algo as AesKeyAlgorithm).length
        if (u8.length * 8 !== len) throwDataError()
        return createTamerCryptoKey(
          'secret',
          extractable,
          { name: 'AES-GCM', length: len } as Algorithm,
          [...keyUsages],
          { t: 'aes', raw: u8 }
        ) as TamerCryptoKey
      }
      if ((algo as HmacImportParams).name === 'HMAC') {
        return createTamerCryptoKey(
          'secret',
          extractable,
          { name: 'HMAC', hash: (algo as HmacImportParams).hash } as Algorithm,
          [...keyUsages],
          { t: 'hmac', raw: u8 }
        ) as TamerCryptoKey
      }
      if ((algo as { name: string }).name === 'PBKDF2') {
        return createTamerCryptoKey(
          'secret',
          extractable,
          { name: 'PBKDF2' } as Algorithm,
          [...keyUsages],
          { t: 'pbkdf2', raw: u8 }
        ) as TamerCryptoKey
      }
      if ((algo as { name: string }).name === 'HKDF') {
        return createTamerCryptoKey(
          'secret',
          extractable,
          { name: 'HKDF' } as Algorithm,
          [...keyUsages],
          { t: 'hkdf', raw: u8 }
        ) as TamerCryptoKey
      }
    }
    if (format === 'pkcs8') {
      const algo = algorithm as EcKeyImportParams | RsaHashedImportParams
      if ((algo as EcKeyImportParams).name === 'ECDSA' && (algo as EcKeyImportParams).namedCurve === 'P-256') {
        return createTamerCryptoKey(
          'private',
          extractable,
          { name: 'ECDSA', namedCurve: 'P-256' } as Algorithm,
          [...keyUsages],
          { t: 'ec-priv', pkcs8: u8 }
        ) as TamerCryptoKey
      }
      if ((algo as RsaHashedImportParams).name === 'RSA-OAEP') {
        return createTamerCryptoKey(
          'private',
          extractable,
          {
            name: 'RSA-OAEP',
            hash: (algo as RsaHashedImportParams).hash,
          } as Algorithm,
          [...keyUsages],
          { t: 'rsa-priv', pkcs8: u8 }
        ) as TamerCryptoKey
      }
    }
    if (format === 'spki') {
      const algo = algorithm as EcKeyImportParams | RsaHashedImportParams
      if ((algo as EcKeyImportParams).name === 'ECDSA' && (algo as EcKeyImportParams).namedCurve === 'P-256') {
        return createTamerCryptoKey(
          'public',
          extractable,
          { name: 'ECDSA', namedCurve: 'P-256' } as Algorithm,
          [...keyUsages],
          { t: 'ec-pub', spki: u8 }
        ) as TamerCryptoKey
      }
      if ((algo as RsaHashedImportParams).name === 'RSA-OAEP') {
        return createTamerCryptoKey(
          'public',
          extractable,
          {
            name: 'RSA-OAEP',
            hash: (algo as RsaHashedImportParams).hash,
          } as Algorithm,
          [...keyUsages],
          { t: 'rsa-pub', spki: u8 }
        ) as TamerCryptoKey
      }
    }
    throw notSupported(`importKey:${format}`)
  }

  async exportKey(format: KeyFormat, key: CryptoKey): Promise<ArrayBuffer | JsonWebKey> {
    const m = getMaterial(key)
    if (format === 'raw') {
      if (m.t === 'aes' || m.t === 'hmac' || m.t === 'pbkdf2' || m.t === 'hkdf') {
        if (!key.extractable) throwInvalidAccess()
        return u8ToArrayBuffer(m.raw)
      }
    }
    if (format === 'pkcs8') {
      if (m.t === 'ec-priv' || m.t === 'rsa-priv') {
        if (!key.extractable) throwInvalidAccess()
        return u8ToArrayBuffer(m.pkcs8)
      }
    }
    if (format === 'spki') {
      if (m.t === 'ec-pub' || m.t === 'rsa-pub') {
        if (!key.extractable) throwInvalidAccess()
        return u8ToArrayBuffer(m.spki)
      }
    }
    if (format === 'jwk') {
      if (!key.extractable) throwInvalidAccess()
      if (m.t === 'aes') {
        return {
          kty: 'oct',
          k: toBase64Url(m.raw),
          alg: 'A256GCM',
          ext: true,
          key_ops: key.usages,
        }
      }
      if (m.t === 'hmac') {
        return {
          kty: 'oct',
          k: toBase64Url(m.raw),
          ext: true,
          key_ops: key.usages,
        }
      }
    }
    throw notSupported(`exportKey:${format}`)
  }

  async wrapKey(): Promise<ArrayBuffer> {
    throw notSupported('wrapKey')
  }

  async unwrapKey(): Promise<CryptoKey> {
    throw notSupported('unwrapKey')
  }
}

type AesDerivedKeyParams = { name: 'AES-GCM' | 'AES-CTR'; length: number }

export function createSubtleCrypto(): SubtleCrypto {
  if (hasNativeCrypto()) return new TamerSubtleCrypto() as unknown as SubtleCrypto
  const w = globalThis.crypto?.subtle
  if (w) return w
  throw new Error('tamer-crypto: no TamerCryptoModule and no Web Crypto subtle')
}

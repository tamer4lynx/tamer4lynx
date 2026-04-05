export type TamerKeyMaterial =
  | { t: 'aes' | 'hmac'; raw: Uint8Array }
  | { t: 'pbkdf2'; raw: Uint8Array }
  | { t: 'hkdf'; raw: Uint8Array }
  | { t: 'ec-priv'; pkcs8: Uint8Array }
  | { t: 'ec-pub'; spki: Uint8Array }
  | { t: 'rsa-priv'; pkcs8: Uint8Array }
  | { t: 'rsa-pub'; spki: Uint8Array }

export type TamerCryptoKey = CryptoKey & { __tamer: TamerKeyMaterial }

export function isTamerKey(k: CryptoKey): k is TamerCryptoKey {
  return '__tamer' in k && typeof (k as TamerCryptoKey).__tamer === 'object'
}

export function createTamerCryptoKey(
  type: KeyType,
  extractable: boolean,
  algorithm: Algorithm,
  usages: readonly KeyUsage[],
  material: TamerKeyMaterial
): TamerCryptoKey {
  const key = Object.create(null) as TamerCryptoKey
  Object.defineProperty(key, 'type', { value: type, enumerable: true })
  Object.defineProperty(key, 'extractable', { value: extractable, enumerable: true })
  Object.defineProperty(key, 'algorithm', { value: algorithm, enumerable: true })
  Object.defineProperty(key, 'usages', { value: Object.freeze(usages.slice()), enumerable: true })
  Object.defineProperty(key, '__tamer', { value: material, enumerable: false })
  return key
}

export function getMaterial(k: CryptoKey): TamerKeyMaterial {
  if (!isTamerKey(k)) throw new TypeError('Not a tamer crypto key')
  return k.__tamer
}

# @tamer4lynx/tamer-crypto

Web Crypto–shaped API for Lynx: [`Crypto`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto) and [`SubtleCrypto`](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) with **native** implementations on **iOS** and **Android** (Java `SecureRandom`, `Cipher`, `MessageDigest`, `Mac`, EC/RSA; Swift `CryptoKit`, `Security`). On hosts that already expose `globalThis.crypto` with `subtle`, that implementation is used when the native module is not linked.

This package is **not** limited to the small surface described in [expo-standard-web-crypto’s README](https://github.com/expo/expo/blob/main/packages/expo-standard-web-crypto/README.md) (which only documents `getRandomValues`). The APIs below are what this package targets for Tier 2.

## Install

```bash
npm install @tamer4lynx/tamer-crypto
```

Link native code with your Lynx host (`t4l link` in a Tamer4Lynx project).

## Usage

```ts
import crypto, { polyfillGlobalCrypto, getTamerCrypto } from '@tamer4lynx/tamer-crypto'

const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hello'))

polyfillGlobalCrypto()
```

Prefer **`getTamerCrypto()`** if you need a stable reference. When `TamerCryptoModule` is present, RNG and `subtle` operations go through native code; otherwise, if the host provides full Web Crypto, that is used.

## Supported operations (Tier 2)

| Area | Support |
|------|---------|
| `crypto.getRandomValues` | Native `getRandomValuesSync` when linked; else host |
| `crypto.randomUUID` | Native `randomUUIDSync` when linked; else host |
| `crypto.timingSafeEqual` | Host if available; else constant-time XOR compare |
| `subtle.digest` | SHA-256, SHA-384, SHA-512 |
| `subtle.encrypt` / `decrypt` | AES-GCM, RSA-OAEP (SHA-256 + MGF1-SHA-256) |
| `subtle.sign` / `verify` | HMAC (SHA-256/384/512), ECDSA P-256 (SHA-256) |
| `subtle.generateKey` | AES-GCM (128/192/256), HMAC, ECDSA P-256, RSA-OAEP (2048+) |
| `subtle.importKey` / `exportKey` | `raw`, `pkcs8`, `spki`; JWK for oct (`k`) AES/HMAC only |
| `subtle.deriveKey` / `deriveBits` | PBKDF2, HKDF (SHA-256/384/512) |
| `subtle.wrapKey` / `unwrapKey` | Not supported (`NotSupportedError`) |

## Platform notes

- **Binary bridge**: native code uses base64 for `Uint8Array` / `ArrayBuffer` payloads on the JS bridge.
- **RSA-OAEP label**: Android supports a non-empty OAEP label; **iOS** rejects non-empty labels (throws). Use an empty label for cross-platform RSA-OAEP, or encrypt only on Android when a label is required.
- **Lynx**: Use `'background only'` in modules that call `NativeModules` (this package does so internally where needed).

## Test vectors (Node)

After `npm run build` in this package:

```bash
npm run test:vectors
```

This compares `subtle.digest` of the empty message against the standard NIST SHA-256/384/512 empty-string hashes and runs a round-trip HMAC sign/verify.

Expected digests (empty input):

| Algorithm | Hex (lowercase) |
|-----------|-----------------|
| SHA-256 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| SHA-384 | `38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b` |
| SHA-512 | `cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e` |

## Intentional gaps vs full W3C Web Crypto

- `wrapKey` / `unwrapKey` are not implemented.
- JWK import/export for RSA and EC keys is not fully implemented (use `spki` / `pkcs8` / `raw`).
- Arbitrary bit lengths for `deriveBits` (not multiple of 8) are not guaranteed.

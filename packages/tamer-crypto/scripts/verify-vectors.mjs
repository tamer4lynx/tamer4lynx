import { getTamerCrypto } from '../dist/src/crypto.js'

const crypto = getTamerCrypto()

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const sha256Empty = toHex(await crypto.subtle.digest('SHA-256', new Uint8Array(0)))
const exp256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
if (sha256Empty !== exp256) {
  console.error('SHA-256( empty ) mismatch', sha256Empty)
  process.exit(1)
}

const sha384Empty = toHex(await crypto.subtle.digest('SHA-384', new Uint8Array(0)))
const exp384 = '38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b'
if (sha384Empty !== exp384) {
  console.error('SHA-384( empty ) mismatch', sha384Empty)
  process.exit(1)
}

const sha512Empty = toHex(await crypto.subtle.digest('SHA-512', new Uint8Array(0)))
const exp512 =
  'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e'
if (sha512Empty !== exp512) {
  console.error('SHA-512( empty ) mismatch', sha512Empty)
  process.exit(1)
}

const key = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign', 'verify'])
const macData = new TextEncoder().encode('tamer-crypto')
const sig = await crypto.subtle.sign({ name: 'HMAC', hash: 'SHA-256' }, key, macData)
const ok = await crypto.subtle.verify({ name: 'HMAC', hash: 'SHA-256' }, key, sig, macData)
if (!ok) {
  console.error('HMAC verify failed')
  process.exit(1)
}

console.log('verify-vectors: ok')

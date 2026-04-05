const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function bytesToBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    s += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)] + (b !== undefined ? B64[(((b & 15) << 2) | ((c ?? 0) >> 6)) & 63] : '=') + (c !== undefined ? B64[c & 63] : '=')
  }
  return s
}

export function base64ToBytes(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff
  return out
}

export function bufferSourceToU8(data: BufferSource): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
}

export function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const b = new ArrayBuffer(u8.byteLength)
  new Uint8Array(b).set(u8)
  return b
}

export function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(s: string): Uint8Array {
  let b = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b.length % 4
  if (pad) b += '===='.slice(pad)
  return base64ToBytes(b)
}

import type { TamerAsset, TamerAssetInput } from './types.js'

const DATA_URI_RE = /^data:([^;,]+)?[;,]/i
const REMOTE_URI_RE = /^[a-z][a-z0-9+.-]*:\/\//i
const FILE_URI_RE = /^file:/i
const WEBPACK_URI_PREFIX = 'webpack:///'
const TAMER_RUNTIME_KEY = '__tamerRuntime'

function stripUrlDecorators(uri: string): string {
  if (uri.startsWith('data:')) return uri
  const hash = uri.indexOf('#')
  const withoutHash = hash >= 0 ? uri.slice(0, hash) : uri
  const query = withoutHash.indexOf('?')
  return query >= 0 ? withoutHash.slice(0, query) : withoutHash
}

function basenameFromUri(uri: string): string {
  const clean = stripUrlDecorators(uri)
  if (!clean || clean.startsWith('data:')) return ''
  try {
    const parsed = REMOTE_URI_RE.test(clean) || FILE_URI_RE.test(clean) ? new URL(clean) : null
    return (parsed?.pathname ?? clean).split('/').filter(Boolean).pop() ?? ''
  } catch {
    return clean.split('/').filter(Boolean).pop() ?? ''
  }
}

function parseNameTypeHash(uri: string): Pick<TamerAsset, 'name' | 'type' | 'hash'> {
  const dataMatch = uri.match(DATA_URI_RE)
  if (dataMatch) {
    const mime = dataMatch[1] ?? 'application/octet-stream'
    return {
      name: 'inline',
      type: mime.split('/').pop() ?? 'octet-stream',
    }
  }

  const filename = basenameFromUri(uri)
  if (!filename) return { name: '', type: '' }
  const parts = filename.split('.')
  if (parts.length === 1) return { name: filename, type: '' }
  const type = parts.pop() ?? ''
  const maybeHash = parts.length > 1 ? parts[parts.length - 1] : undefined
  const hash = maybeHash && /^[a-f0-9]{6,}$/i.test(maybeHash) ? maybeHash : undefined
  const name = hash ? parts.slice(0, -1).join('.') : parts.join('.')
  return { name, type, hash }
}

function isEmbeddedUri(uri: string): boolean {
  return !!uri && !DATA_URI_RE.test(uri) && !REMOTE_URI_RE.test(uri) && !FILE_URI_RE.test(uri)
}

function runtimeDevBundleUrl(): string | undefined {
  const runtime = (globalThis as unknown as { lynx?: { __initData?: Record<string, unknown>; __globalProps?: Record<string, unknown> } }).lynx
  const initRuntime = runtime?.__initData?.[TAMER_RUNTIME_KEY]
  const globalRuntime = runtime?.__globalProps?.[TAMER_RUNTIME_KEY]
  const devRuntime =
    initRuntime && typeof initRuntime === 'object'
      ? initRuntime as Record<string, unknown>
      : globalRuntime && typeof globalRuntime === 'object'
        ? globalRuntime as Record<string, unknown>
        : undefined

  if (devRuntime?.env !== 'development' || devRuntime?.host !== 'tamer-dev-client') return undefined
  const runtimeBundle = devRuntime.bundleUrl
  if (typeof runtimeBundle === 'string' && runtimeBundle.trim()) return runtimeBundle.trim()
  return undefined
}

function toAbsoluteDevAssetUri(uri: string): string {
  if (!uri || DATA_URI_RE.test(uri) || REMOTE_URI_RE.test(uri) || FILE_URI_RE.test(uri)) return uri
  const bundleUrl = runtimeDevBundleUrl()
  if (!bundleUrl) return uri

  let assetPath = uri.startsWith(WEBPACK_URI_PREFIX) ? uri.slice(WEBPACK_URI_PREFIX.length) : uri
  if (assetPath.startsWith('/')) assetPath = assetPath.slice(1)
  if (!assetPath.startsWith('static/') && !assetPath.startsWith('assets/')) return uri

  try {
    const base = bundleUrl.endsWith('.bundle') ? bundleUrl : `${bundleUrl.replace(/\/+$/, '')}/`
    return new URL(assetPath, base).toString()
  } catch {
    return uri
  }
}

export function resolveAssetSource(input: TamerAssetInput | null | undefined): TamerAsset | null {
  if (input == null) return null

  if (typeof input === 'string') {
    const normalizedUri = toAbsoluteDevAssetUri(input)
    const parsed = parseNameTypeHash(normalizedUri)
    return {
      uri: normalizedUri,
      localUri: normalizedUri,
      embedded: isEmbeddedUri(normalizedUri),
      ...parsed,
    }
  }

  const rawUri = input.uri ?? input.localUri
  const uri = rawUri ? toAbsoluteDevAssetUri(rawUri) : rawUri
  if (!uri) return null
  const parsed = parseNameTypeHash(uri)
  return {
    uri,
    localUri: input.localUri ? toAbsoluteDevAssetUri(input.localUri) : uri,
    name: input.name ?? parsed.name,
    type: input.type ?? parsed.type,
    hash: input.hash ?? parsed.hash,
    width: input.width,
    height: input.height,
    embedded: input.embedded ?? isEmbeddedUri(uri),
  }
}

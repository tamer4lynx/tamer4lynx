import path from 'path'
import type { AssetManifest, AssetManifestEntry } from '../types.js'

async function probeImageSize(
  source: unknown,
  filePath?: string,
): Promise<{ width?: number; height?: number } | null> {
  try {
    // Prefer buffer from compiled asset (works in dev + prod)
    const buf: Buffer | Uint8Array | undefined =
      source && typeof source === 'object' && 'buffer' in source && typeof (source as { buffer: unknown }).buffer === 'function'
        ? (source as { buffer: () => Buffer }).buffer()
        : undefined
    if (buf?.length) {
      const { imageSize } = await import('image-size')
      const result = imageSize(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
      return { width: result.width, height: result.height }
    }
    // Fallback: read from source file path (prod builds)
    if (filePath) {
      const { imageSizeFromFile } = await import('image-size/fromFile')
      const result = await imageSizeFromFile(filePath)
      return { width: result.width, height: result.height }
    }
    return null
  } catch {
    return null
  }
}

type RspackCompiler = {
  hooks?: {
    thisCompilation?: {
      tap: (name: string, handler: (compilation: RspackCompilation) => void) => void
    }
  }
  webpack?: {
    Compilation?: { PROCESS_ASSETS_STAGE_SUMMARIZE?: number }
    sources?: { RawSource?: new (value: string) => unknown }
  }
}

type RspackCompilation = {
  hooks?: {
    processAssets?: {
      tapPromise: (options: { name: string; stage?: number }, handler: (assets: Record<string, unknown>) => Promise<void>) => void
    }
  }
  assetsInfo?: Map<string, { sourceFilename?: string }>
  emitAsset?: (filename: string, source: unknown) => void
  updateAsset?: (filename: string, source: unknown) => void
  compiler?: RspackCompiler
}

const PLUGIN_NAME = 'TamerAssetsManifestPlugin'
export const MANIFEST_FILENAME = 'tamer-assets.json'

const ASSET_EXTENSION_RE = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|ttf|otf|woff2?|eot|mp3|m4a|aac|wav|ogg|mp4|webm|mov|json)$/i
const BUNDLE_EXTENSION_RE = /\.(lynx|web)\.bundle(?:\.map)?$/i

const IMAGE_EXTENSION_RE = /\.(png|jpe?g|gif|webp|avif|bmp)$/i

export function mimeFromFilename(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase()
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2',
    eot: 'application/vnd.ms-fontobject',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    json: 'application/json',
  }
  return map[ext] ?? 'application/octet-stream'
}

export function inferHash(filename: string): string | undefined {
  const stem = path.basename(filename, path.extname(filename))
  const parts = stem.split('.')
  const maybeHash = parts.length > 1 ? parts[parts.length - 1] : undefined
  return maybeHash && /^[a-f0-9]{6,}$/i.test(maybeHash) ? maybeHash : undefined
}

function assetSize(asset: unknown): number | undefined {
  if (!asset || typeof asset !== 'object' || !('size' in asset)) return undefined
  const size = (asset as { size?: unknown }).size
  if (typeof size !== 'function') return undefined
  const value = size.call(asset)
  return typeof value === 'number' ? value : undefined
}

function shouldIncludeAsset(filename: string): boolean {
  if (filename === MANIFEST_FILENAME) return false
  if (filename === 'stats.json') return false
  if (filename.endsWith('.map')) return false
  if (BUNDLE_EXTENSION_RE.test(filename)) return false
  return ASSET_EXTENSION_RE.test(filename)
}

function createRawSource(compiler: RspackCompiler | undefined, value: string): unknown {
  const RawSource = compiler?.webpack?.sources?.RawSource
  if (RawSource) return new RawSource(value)
  return {
    source: () => value,
    size: () => value.length,
  }
}

export function createTamerAssetManifestPlugin() {
  return {
    name: PLUGIN_NAME,
    apply(compiler: RspackCompiler) {
      compiler.hooks?.thisCompilation?.tap(PLUGIN_NAME, (compilation) => {
        const stage = compiler.webpack?.Compilation?.PROCESS_ASSETS_STAGE_SUMMARIZE
        compilation.hooks?.processAssets?.tapPromise({ name: PLUGIN_NAME, stage }, async (assets) => {
          const filenames = Object.keys(assets).filter(shouldIncludeAsset).sort()

          const entries: AssetManifestEntry[] = await Promise.all(
            filenames.map(async (filename) => {
              const sourceFilename = compilation.assetsInfo?.get(filename)?.sourceFilename
              let dims: { width?: number; height?: number } | null = null
              if (IMAGE_EXTENSION_RE.test(filename)) {
                dims = await probeImageSize(assets[filename], sourceFilename)
              }
              return {
                uri: filename,
                type: mimeFromFilename(filename),
                size: assetSize(assets[filename]),
                hash: inferHash(filename),
                source: sourceFilename,
                width: dims?.width,
                height: dims?.height,
              }
            }),
          )

          const manifest: AssetManifest = {
            version: 1,
            generatedBy: '@tamer4lynx/tamer-asset',
            assets: entries,
          }
          const source = createRawSource(
            compilation.compiler ?? compiler,
            `${JSON.stringify(manifest, null, 2)}\n`,
          )
          if (assets[MANIFEST_FILENAME] && compilation.updateAsset) {
            compilation.updateAsset(MANIFEST_FILENAME, source)
          } else {
            compilation.emitAsset?.(MANIFEST_FILENAME, source)
          }
        })
      })
    },
  }
}

export function appendTamerAssetManifestPlugin(config: Record<string, unknown>): Record<string, unknown> {
  const plugins = Array.isArray(config.plugins) ? config.plugins : []
  const hasPlugin = plugins.some((plugin) => {
    if (!plugin || typeof plugin !== 'object') return false
    const name =
      (plugin as { name?: unknown }).name ??
      (plugin as { constructor?: { name?: string } }).constructor?.name
    return name === PLUGIN_NAME
  })
  if (hasPlugin) return config
  return {
    ...config,
    plugins: [...plugins, createTamerAssetManifestPlugin()],
  }
}

/** Optional: preserve ?inline support for consumers who opt in via inline:true plugin option. */
export function appendInlineAssetRule(config: Record<string, unknown>): Record<string, unknown> {
  const moduleConfig =
    config.module && typeof config.module === 'object' && !Array.isArray(config.module)
      ? (config.module as Record<string, unknown>)
      : {}
  const rules = Array.isArray(moduleConfig.rules) ? moduleConfig.rules : []
  const hasInlineRule = rules.some((rule) => {
    if (!rule || typeof rule !== 'object') return false
    const r = rule as Record<string, unknown>
    return String(r.type ?? '') === 'asset/inline' && String(r.resourceQuery ?? '').includes('inline')
  })
  if (hasInlineRule) return config
  return {
    ...config,
    module: {
      ...moduleConfig,
      rules: [
        ...rules,
        {
          resourceQuery: /inline/,
          type: 'asset/inline',
        },
      ],
    },
  }
}

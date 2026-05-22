/**
 * Webpack/rspack loader: transforms useAssets(['./a.png', './b.png'])
 * into useAssets([require('./a.png'), require('./b.png')]) so rspack
 * handles resolution, hashing, and asset copying for paths supplied as strings.
 *
 * Dynamic expressions inside useAssets([]) cause a hard build error with source location.
 */

type LoaderContext = {
  resourcePath: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitError(err: Error): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback(err: Error | null, result?: string): void
}

const USE_ASSETS_RE = /\buseAssets\s*\(\s*\[/g

function transformUseAssets(source: string, resourcePath: string, emitError: (e: Error) => void): string {
  let result = source
  let offset = 0

  for (const match of source.matchAll(USE_ASSETS_RE)) {
    const callStart = match.index! + offset
    const arrayStart = result.indexOf('[', callStart + match[0].length - 1 + offset - (source.length - result.length))

    // Walk through the array content, bracket-balanced
    let depth = 0
    let i = arrayStart
    while (i < result.length) {
      const ch = result[i]
      if (ch === '[') depth++
      else if (ch === ']') { depth--; if (depth === 0) break }
      i++
    }
    const arrayEnd = i
    const arrayContent = result.slice(arrayStart, arrayEnd + 1)

    // Extract individual string literals inside the array.
    // Pattern: any ' or " or ` delimited string. Template literals = error.
    const transformed = arrayContent.replace(
      /(`[^`]*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\$\{)/g,
      (token) => {
        if (token === '${' || token.startsWith('`')) {
          emitError(
            new Error(
              `[tamer-assets] useAssets() only accepts static string literals.\n` +
              `Dynamic or template-literal paths are not supported.\n` +
              `File: ${resourcePath}`,
            ),
          )
          return token
        }
        // Wrap plain string literal in require()
        return `require(${token})`
      },
    )

    const before = result.slice(0, arrayStart)
    const after = result.slice(arrayEnd + 1)
    const delta = transformed.length - arrayContent.length
    result = before + transformed + after
    offset += delta
  }

  return result
}

export default function useAssetsLoader(this: LoaderContext, source: string): void {
  if (!source.includes('useAssets')) {
    this.callback(null, source)
    return
  }

  const errors: Error[] = []
  const transformed = transformUseAssets(source, this.resourcePath, (e) => errors.push(e))

  if (errors.length > 0) {
    this.callback(errors[0])
    return
  }

  this.callback(null, transformed)
}

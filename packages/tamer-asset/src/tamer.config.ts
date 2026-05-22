import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { RsbuildPlugin } from '@rsbuild/core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Loader lives adjacent to this file after tsc: dist/plugin/useAssetsLoader.js
const loaderPath = path.join(__dirname, 'plugin', 'useAssetsLoader.js')

const pluginTamerAsset: RsbuildPlugin = {
  name: 'plugin-tamer-asset',
  setup(api) {
    api.modifyRspackConfig((config) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = (config.module ?? {}) as any
      mod.rules = [
        ...(mod.rules ?? []),
        { test: /\.[jt]sx?$/, exclude: /node_modules/, loader: loaderPath },
      ]
      config.module = mod
    })
  },
}

export default {
  tamerAsset: pluginTamerAsset,
}

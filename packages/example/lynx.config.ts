import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin'
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin'
import { pluginTypeCheck } from '@rsbuild/plugin-type-check'
import { pluginTamer } from 'tamer-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  source: {
    alias: {
      'tamer-screen': path.resolve(__dirname, '../tamer-screen/src/index.tsx'),
    },
  },
  plugins: [
    pluginTamer(),
    pluginQRCode({
      schema(url) {
        return `${url}?fullscreen=true`
      },
    }),
    pluginReactLynx(),
    pluginTypeCheck(),
  ],
}

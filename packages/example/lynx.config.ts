import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import { config } from 'dotenv'
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin'
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin'
import { pluginTypeCheck } from '@rsbuild/plugin-type-check'
import { pluginTamer } from '@tamer4lynx/tamer-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '.env') })

export default {
  source: {
    alias: {
      '@tamer4lynx/tamer-app-shell': path.resolve(__dirname, '../tamer-app-shell/src/index.tsx'),
      '@tamer4lynx/tamer-screen': path.resolve(__dirname, '../tamer-screen/src/index.tsx'),
      '@tamer4lynx/tamer-icons': path.resolve(__dirname, '../tamer-icons/src/index.tsx'),
      '@tamer4lynx/tamer-auth': path.resolve(__dirname, '../tamer-auth/src/index.ts'),
      '@tamer4lynx/tamer-linking': path.resolve(__dirname, '../tamer-linking/src/index.ts'),
      '@tamer4lynx/tamer-display-browser': path.resolve(__dirname, '../tamer-display-browser/src/index.ts'),
    },
    define: {
      __OAUTH_CLIENT_ID__: JSON.stringify(process.env.OAUTH_CLIENT_ID ?? ''),
      __OAUTH_CLIENT_SECRET__: JSON.stringify(process.env.OAUTH_CLIENT_SECRET ?? ''),
      __OAUTH_AUTHORIZATION_ENDPOINT__: JSON.stringify(process.env.OAUTH_AUTHORIZATION_ENDPOINT ?? 'https://authorization-server.com/authorize'),
      __OAUTH_TOKEN_ENDPOINT__: JSON.stringify(process.env.OAUTH_TOKEN_ENDPOINT ?? 'https://authorization-server.com/token'),
      __OAUTH_SCOPE__: JSON.stringify(process.env.OAUTH_SCOPE ?? 'photo offline_access'),
      __OAUTH_REDIRECT_URI__: JSON.stringify(process.env.OAUTH_REDIRECT_URI ?? 'tamerdevapp://auth/callback'),
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
    pluginTypeCheck({ enable: process.env.TAMER_TYPE_CHECK === '1' }),
  ],
}

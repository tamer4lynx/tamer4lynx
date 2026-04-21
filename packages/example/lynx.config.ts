import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'

const require = createRequire(import.meta.url)
/** @react-navigation/core must resolve `react` to ReactLynx (same `isValidElement` / element type identity as app code). */
const reactLynx = require.resolve('@lynx-js/react')
const reactLynxJsxRuntime = require.resolve('@lynx-js/react/jsx-runtime')
const reactLynxJsxDevRuntime = require.resolve('@lynx-js/react/jsx-dev-runtime')
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin'
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin'
import { pluginTypeCheck } from '@rsbuild/plugin-type-check'
import { pluginTamer } from '@tamer4lynx/tamer-plugin'
import { pluginTamerEnv } from '@tamer4lynx/tamer-env'
// import { tamerRouterPlugin } from '@tamer4lynx/tamer-router/plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  resolve: {
    dedupe: ['@react-navigation/core', '@react-navigation/routers'],
    alias: {
      react: reactLynx,
      'react/jsx-runtime': reactLynxJsxRuntime,
      'react/jsx-dev-runtime': reactLynxJsxDevRuntime,
      '@tamer4lynx/tamer-app-shell': path.resolve(__dirname, '../tamer-app-shell/src/index.tsx'),
      '@tamer4lynx/tamer-navigation': path.resolve(__dirname, '../tamer-navigation/src/index.ts'),
      '@tamer4lynx/tamer-router': path.resolve(__dirname, '../tamer-router/src/index.ts'),
      '@tamer4lynx/tamer-screen': path.resolve(__dirname, '../tamer-screen/src/index.tsx'),
      '@tamer4lynx/tamer-icons': path.resolve(__dirname, '../tamer-icons/src/index.tsx'),
      '@tamer4lynx/tamer-auth': path.resolve(__dirname, '../tamer-auth/src/index.ts'),
      '@tamer4lynx/tamer-linking': path.resolve(__dirname, '../tamer-linking/src/index.ts'),
      '@tamer4lynx/tamer-display-browser': path.resolve(__dirname, '../tamer-display-browser/src/index.ts'),
    },
  },
  plugins: [
    pluginTamer({
      // tamerRouter: tamerRouterPlugin({
      //   root: './src/pages',
      //   layoutFilename: '_layout.tsx',
      //   // lazyRoutes: true,
      //   globalStyleImports: ['./src/App.css'],
      // }),
      tamerEnv: pluginTamerEnv({
        root: __dirname,
        defineFromEnv: {
          __OAUTH_CLIENT_ID__: 'OAUTH_CLIENT_ID',
          __OAUTH_CLIENT_SECRET__: 'OAUTH_CLIENT_SECRET',
          __OAUTH_AUTHORIZATION_ENDPOINT__: 'OAUTH_AUTHORIZATION_ENDPOINT',
          __OAUTH_TOKEN_ENDPOINT__: 'OAUTH_TOKEN_ENDPOINT',
          __OAUTH_SCOPE__: 'OAUTH_SCOPE',
          __OAUTH_REDIRECT_URI__: 'OAUTH_REDIRECT_URI',
        },
        envDefaults: {
          OAUTH_AUTHORIZATION_ENDPOINT: 'https://authorization-server.com/authorize',
          OAUTH_TOKEN_ENDPOINT: 'https://authorization-server.com/token',
          OAUTH_SCOPE: 'photo offline_access',
          OAUTH_REDIRECT_URI: 'tamerdevapp://auth/callback',
        },
      }),
    }),
    pluginQRCode({
      schema(url) {
        return `${url}?fullscreen=true`
      },
    }),
    pluginReactLynx(),
    pluginTypeCheck({ enable: process.env.TAMER_TYPE_CHECK === '1' }),
  ],
}

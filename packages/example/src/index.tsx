import '@lynx-js/react/debug'
import '@tamer4lynx/tamer-transports/lynx'
import { root } from '@lynx-js/react'
import { FileRouter } from '@tamer4lynx/tamer-router'

import routes from '@tamer4lynx/tamer-router/generated-routes'

root.render(<FileRouter routes={routes} /> as JSX.Element)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}

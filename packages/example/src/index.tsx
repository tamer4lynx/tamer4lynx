import '@lynx-js/react/debug'
import 'tamer-transports/lynx'
import { root } from '@lynx-js/react'
import { FileRouter } from 'tamer-router'

import routes from 'tamer-router/generated-routes'

root.render(<FileRouter routes={routes} />)

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}

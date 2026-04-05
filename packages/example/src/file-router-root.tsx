import { FileRouter } from '@tamer4lynx/tamer-router'
import routeTree from '@tamer4lynx/tamer-router/generated-routes'
import type { ReactNode } from 'react'

type LynxRoot = { render: (node: ReactNode) => void }

export function mountFileRouter(root: LynxRoot): void {
  root.render(<FileRouter routes={routeTree} navigationHost="native-module" />)
}

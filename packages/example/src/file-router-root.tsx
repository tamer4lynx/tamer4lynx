import { TamerStateSyncProvider, FileRouter } from '@tamer4lynx/tamer-router'
import type { ReactNode } from 'react'

import { demoTamerStateSync } from './demo-tamer-state.js'
import { TamerAppRoutes, TAMER_KNOWN_PATHS } from './tamer-app-routes.js'

type LynxRoot = { render: (node: ReactNode) => void }

function DemoProviders({ children }: { children: ReactNode }) {
  return <TamerStateSyncProvider syncs={[demoTamerStateSync]}>{children}</TamerStateSyncProvider>
}

export function mountFileRouter(root: LynxRoot): void {
  root.render(
    <DemoProviders>
      <FileRouter knownPaths={TAMER_KNOWN_PATHS} coordinatorInitialPath="/tabs">
        <TamerAppRoutes />
      </FileRouter>
    </DemoProviders>,
  )
}

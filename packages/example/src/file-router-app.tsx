import { TamerStateSyncProvider, FileRouter } from '@tamer4lynx/tamer-router'
import './tamer-app-routes.js'
import { demoTamerStateSync } from './demo-tamer-state.js'
import { useExamplePalette } from './examplePalette.js'

export function FileRouterApp() {
  useExamplePalette()
  return (
    <TamerStateSyncProvider syncs={[demoTamerStateSync]}>
      <FileRouter />
    </TamerStateSyncProvider>
  )
}

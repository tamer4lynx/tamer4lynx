import { px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDetailPage } from '../../connectors-demo-page.js'
import { useTanstackDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function TanstackDetailPage() {
  const p = useExamplePalette()
  const value = useTanstackDemo()
  return (
    <ConnectorDetailPage
      syncKey="demoTanstack"
      title="TanStack Query · detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>count: {value.count}</text>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>source: {value.source}</text>
        </view>
      }
    />
  )
}

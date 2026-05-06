import { px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDetailPage } from '../../connectors-demo-page.js'
import { useZustandDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function ZustandDetailPage() {
  const p = useExamplePalette()
  const value = useZustandDemo()
  return (
    <ConnectorDetailPage
      syncKey="demoZustand"
      title="Zustand · detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>count: {value.count}</text>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>note: {value.note}</text>
        </view>
      }
    />
  )
}

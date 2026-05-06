import { px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDetailPage } from '../../connectors-demo-page.js'
import { useSwrDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function SwrDetailPage() {
  const p = useExamplePalette()
  const value = useSwrDemo()
  return (
    <ConnectorDetailPage
      syncKey="demoSwr"
      title="SWR · detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>count: {value.count}</text>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>label: {value.label}</text>
        </view>
      }
    />
  )
}

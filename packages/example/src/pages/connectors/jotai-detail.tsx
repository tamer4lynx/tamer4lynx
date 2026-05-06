import { px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDetailPage } from '../../connectors-demo-page.js'
import { useJotaiDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function JotaiDetailPage() {
  const p = useExamplePalette()
  const value = useJotaiDemo()
  return (
    <ConnectorDetailPage
      syncKey="demoJotai"
      title="Jotai · detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>count: {value.count}</text>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>label: {value.label}</text>
        </view>
      }
    />
  )
}

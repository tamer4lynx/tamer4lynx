import { useCallback } from '@lynx-js/react'
import { Button, px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDemoPage } from '../../connectors-demo-page.js'
import { incSwr, useSwrDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function SwrPage() {
  const p = useExamplePalette()
  const value = useSwrDemo()

  const onInc = useCallback(() => {
    'background only'
    incSwr()
  }, [])

  return (
    <ConnectorDemoPage
      syncKey="demoSwr"
      title="SWR"
      description="Tracked SWR cache via createTrackedSwrCache. Bridged via createSwrSync."
      detailPath="/connectors/swr-detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>count: {value.count}</text>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>label: {value.label}</text>
        </view>
      }
      actions={
        <Button label="Increment cache entry" variant="filled" onTap={onInc} style={{ width: '100%' }} />
      }
    />
  )
}

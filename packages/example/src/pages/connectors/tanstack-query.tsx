import { useCallback } from '@lynx-js/react'
import { Button, px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDemoPage } from '../../connectors-demo-page.js'
import { incTanstack, useTanstackDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function TanstackPage() {
  const p = useExamplePalette()
  const value = useTanstackDemo()

  const onInc = useCallback(() => {
    'background only'
    incTanstack()
  }, [])

  return (
    <ConnectorDemoPage
      syncKey="demoTanstack"
      title="TanStack Query"
      description="QueryClient cache bridged via dehydrate/hydrate. Pushed view should reuse cached entry without refetch."
      detailPath="/connectors/tanstack-query-detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>count: {value.count}</text>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>source: {value.source}</text>
        </view>
      }
      actions={
        <Button label="Increment cached query" variant="filled" onTap={onInc} style={{ width: '100%' }} />
      }
    />
  )
}

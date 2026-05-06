import { useCallback } from '@lynx-js/react'
import { Button, px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDemoPage } from '../../connectors-demo-page.js'
import { incJotai, useJotaiDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function JotaiPage() {
  const p = useExamplePalette()
  const value = useJotaiDemo()

  const onInc = useCallback(() => {
    'background only'
    incJotai()
  }, [])

  return (
    <ConnectorDemoPage
      syncKey="demoJotai"
      title="Jotai"
      description="Jotai v2 store + atom map. createJotaiSync subscribes per-atom and aggregates."
      detailPath="/connectors/jotai-detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>count: {value.count}</text>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>label: {value.label}</text>
        </view>
      }
      actions={
        <Button label="store.set(countAtom, +1)" variant="filled" onTap={onInc} style={{ width: '100%' }} />
      }
    />
  )
}

import { useCallback } from '@lynx-js/react'
import { Button, px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDemoPage } from '../../connectors-demo-page.js'
import { incZustand, setZustandNote, useZustandDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function ZustandPage() {
  const p = useExamplePalette()
  const value = useZustandDemo()

  const onInc = useCallback(() => {
    'background only'
    incZustand()
  }, [])
  const onNote = useCallback(() => {
    'background only'
    setZustandNote(`updated@${Date.now() % 100000}`)
  }, [])

  return (
    <ConnectorDemoPage
      syncKey="demoZustand"
      title="Zustand"
      description="Vanilla Zustand store wrapped with createZustandSync. Push detail to verify hydration."
      detailPath="/connectors/zustand-detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>count: {value.count}</text>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>note: {value.note}</text>
        </view>
      }
      actions={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(8) }}>
          <Button label="Increment count" variant="filled" onTap={onInc} style={{ width: '100%' }} />
          <Button label="Randomize note" variant="tonal" onTap={onNote} style={{ width: '100%' }} />
        </view>
      }
    />
  )
}

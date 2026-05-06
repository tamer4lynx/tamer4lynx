import { useCallback } from '@lynx-js/react'
import { Button, px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDemoPage } from '../../connectors-demo-page.js'
import { setRecoilDemo, useRecoilDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function RecoilPage() {
  const p = useExamplePalette()
  const value = useRecoilDemo()

  const onInc = useCallback(() => {
    'background only'
    setRecoilDemo((prev) => ({ ...prev, count: prev.count + 1, label: 'recoil-inc' }))
  }, [])
  const onLabel = useCallback(() => {
    'background only'
    setRecoilDemo((prev) => ({ ...prev, label: `r-${Date.now() % 100000}` }))
  }, [])

  return (
    <ConnectorDemoPage
      syncKey="demoRecoil"
      title="Recoil"
      description="Recoil atom bridged via createRecoilSync — the bundle ships an atom effect that you attach to your atom's `effects` array."
      detailPath="/connectors/recoil-detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>count: {value.count}</text>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>label: {value.label}</text>
        </view>
      }
      actions={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(8) }}>
          <Button label="Increment count" variant="filled" onTap={onInc} style={{ width: '100%' }} />
          <Button label="Randomize label" variant="tonal" onTap={onLabel} style={{ width: '100%' }} />
        </view>
      }
    />
  )
}

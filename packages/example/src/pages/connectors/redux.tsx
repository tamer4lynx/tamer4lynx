import { useCallback } from '@lynx-js/react'
import { Button, px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDemoPage } from '../../connectors-demo-page.js'
import { incRedux, reduxSetLabel, reduxStore, useReduxDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function ReduxPage() {
  const p = useExamplePalette()
  const value = useReduxDemo()

  const onInc = useCallback(() => {
    'background only'
    incRedux()
  }, [])
  const onLabel = useCallback(() => {
    'background only'
    reduxStore.dispatch(reduxSetLabel(`label-${Date.now() % 100000}`))
  }, [])

  return (
    <ConnectorDemoPage
      syncKey="demoRedux"
      title="Redux"
      description="RTK store + slice. createReduxSync auto-installs HYDRATE handler via replaceReducer."
      detailPath="/connectors/redux-detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>count: {value.count}</text>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>label: {value.label}</text>
        </view>
      }
      actions={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(8) }}>
          <Button label="Dispatch inc()" variant="filled" onTap={onInc} style={{ width: '100%' }} />
          <Button label="Dispatch setLabel()" variant="tonal" onTap={onLabel} style={{ width: '100%' }} />
        </view>
      }
    />
  )
}

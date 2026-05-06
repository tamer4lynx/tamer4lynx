import { useCallback } from '@lynx-js/react'
import { Button, px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDemoPage } from '../../connectors-demo-page.js'
import { incApollo, useApolloDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function ApolloPage() {
  const p = useExamplePalette()
  const value = useApolloDemo()

  const onInc = useCallback(() => {
    'background only'
    incApollo()
  }, [])

  return (
    <ConnectorDemoPage
      syncKey="demoApollo"
      title="Apollo"
      description="InMemoryCache snapshot via client.extract / client.cache.restore. Subscribe is a no-op (Apollo lacks public global subscribe), so live UI here re-renders via local state, but hydration on push works."
      detailPath="/connectors/apollo-detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>count: {value.count}</text>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>note: {value.note}</text>
        </view>
      }
      actions={
        <Button label="Write demo @client field" variant="filled" onTap={onInc} style={{ width: '100%' }} />
      }
    />
  )
}

import { px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDetailPage } from '../../connectors-demo-page.js'
import { useApolloDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function ApolloDetailPage() {
  const p = useExamplePalette()
  const value = useApolloDemo()
  return (
    <ConnectorDetailPage
      syncKey="demoApollo"
      title="Apollo · detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>count: {value.count}</text>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>note: {value.note}</text>
        </view>
      }
    />
  )
}

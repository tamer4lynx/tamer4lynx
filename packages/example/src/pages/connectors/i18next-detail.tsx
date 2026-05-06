import { px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDetailPage } from '../../connectors-demo-page.js'
import { useI18nDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function I18nextDetailPage() {
  const p = useExamplePalette()
  const value = useI18nDemo()
  return (
    <ConnectorDetailPage
      syncKey="demoI18n"
      title="i18next · detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>language: {value.language}</text>
          <text style={{ color: p.onSurface, fontSize: px(16) }}>{value.greeting}</text>
          <text style={{ color: p.onSurfaceVariant, fontSize: px(13) }}>{value.subtitle}</text>
        </view>
      }
    />
  )
}

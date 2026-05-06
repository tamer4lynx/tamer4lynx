import { px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDetailPage } from '../../connectors-demo-page.js'
import { useThemeDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

export default function ThemeDetailPage() {
  const p = useExamplePalette()
  const value = useThemeDemo()
  return (
    <ConnectorDetailPage
      syncKey="demoTheme"
      title="Theme · detail"
      liveValue={<text style={{ color: p.onSurface, fontSize: px(16) }}>theme: {value}</text>}
    />
  )
}

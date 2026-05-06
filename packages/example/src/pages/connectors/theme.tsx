import { useCallback } from '@lynx-js/react'
import { Button, px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDemoPage } from '../../connectors-demo-page.js'
import { setDemoTheme, useThemeDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

const OPTIONS: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']

export default function ThemePage() {
  const p = useExamplePalette()
  const value = useThemeDemo()

  const pick = useCallback(
    (next: 'light' | 'dark' | 'system') => () => {
      'background only'
      setDemoTheme(next)
    },
    [],
  )

  return (
    <ConnectorDemoPage
      syncKey="demoTheme"
      title="Theme"
      description="Generic theme connector — string token bridged across LynxView boundaries. Library-agnostic."
      detailPath="/connectors/theme-detail"
      liveValue={
        <text style={{ color: p.onSurface, fontSize: px(16) }}>theme: {value}</text>
      }
      actions={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(8) }}>
          {OPTIONS.map((o) => (
            <Button
              key={o}
              label={o}
              variant={value === o ? 'filled' : 'tonal'}
              onTap={pick(o)}
              style={{ width: '100%' }}
            />
          ))}
        </view>
      }
    />
  )
}

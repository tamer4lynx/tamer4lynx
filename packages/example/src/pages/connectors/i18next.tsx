import { useCallback } from '@lynx-js/react'
import { Button, px } from '@tamer4lynx/tamer-app-shell'

import { ConnectorDemoPage } from '../../connectors-demo-page.js'
import { setI18nLanguage, useI18nDemo } from '../../connectors-state.js'
import { useExamplePalette } from '../../examplePalette.js'

const LANGS: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
]

export default function I18nextPage() {
  const p = useExamplePalette()
  const value = useI18nDemo()

  const switchTo = useCallback(
    (code: string) => () => {
      'background only'
      setI18nLanguage(code)
    },
    [],
  )

  return (
    <ConnectorDemoPage
      syncKey="demoI18n"
      title="i18next"
      description="i18next instance bridged via createI18nextSync. Language string syncs across LynxView pushes."
      detailPath="/connectors/i18next-detail"
      liveValue={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <text style={{ color: p.onSurface, fontSize: px(14) }}>language: {value.language}</text>
          <text style={{ color: p.onSurface, fontSize: px(16) }}>{value.greeting}</text>
          <text style={{ color: p.onSurfaceVariant, fontSize: px(13) }}>{value.subtitle}</text>
        </view>
      }
      actions={
        <view style={{ display: 'flex', flexDirection: 'column', gap: px(8) }}>
          {LANGS.map((l) => (
            <Button
              key={l.code}
              label={l.label}
              variant={value.language === l.code ? 'filled' : 'tonal'}
              onTap={switchTo(l.code)}
              style={{ width: '100%' }}
            />
          ))}
        </view>
      }
    />
  )
}

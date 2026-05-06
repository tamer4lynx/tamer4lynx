import { useCallback, useMemo } from '@lynx-js/react'
import { Card, px } from '@tamer4lynx/tamer-app-shell'
import { useTamerNavigate } from '@tamer4lynx/tamer-router'

import { pageShellStyle, useExamplePalette } from '../../examplePalette.js'

const ENTRIES: Array<{ key: string; title: string; subtitle: string; path: string }> = [
  { key: 'zustand', title: 'Zustand', subtitle: 'createZustandSync', path: '/connectors/zustand' },
  { key: 'redux', title: 'Redux', subtitle: 'createReduxSync (auto HYDRATE)', path: '/connectors/redux' },
  {
    key: 'tanstack-query',
    title: 'TanStack Query',
    subtitle: 'createTanstackQuerySync',
    path: '/connectors/tanstack-query',
  },
  { key: 'apollo', title: 'Apollo', subtitle: 'createApolloSync', path: '/connectors/apollo' },
  { key: 'swr', title: 'SWR', subtitle: 'createSwrSync + tracked cache', path: '/connectors/swr' },
  { key: 'jotai', title: 'Jotai', subtitle: 'createJotaiSync (atom map)', path: '/connectors/jotai' },
  { key: 'i18next', title: 'i18next', subtitle: 'createI18nextSync', path: '/connectors/i18next' },
  { key: 'theme', title: 'Theme', subtitle: 'createThemeSync (generic)', path: '/connectors/theme' },
  { key: 'recoil', title: 'Recoil', subtitle: 'createRecoilSync (atom effect)', path: '/connectors/recoil' },
]

export default function ConnectorsHub() {
  const p = useExamplePalette()
  const { push } = useTamerNavigate()

  const go = useCallback(
    (path: string) => () => {
      'background only'
      push(path)
    },
    [push],
  )

  const items = useMemo(
    () => ENTRIES.map((e) => ({ ...e, onTap: go(e.path) })),
    [go],
  )

  return (
    <scroll-view scroll-y style={pageShellStyle(p.background)}>
      <view style={{ padding: px(16), gap: px(12), display: 'flex', flexDirection: 'column' }}>
        <text style={{ color: p.onSurface, fontSize: px(20), fontWeight: '600' }}>
          State sync connectors
        </text>
        <text style={{ color: p.onSurfaceVariant, fontSize: px(13), lineHeight: px(18) }}>
          Each page mutates a store, then pushes a child screen that reads the same state via the
          tamer-router connector. Verifies hydration across LynxView boundaries.
        </text>
        {items.map((it) => (
          <Card key={`connector-${it.key}`} variant="filled" onTap={it.onTap}>
            <view style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
              <text style={{ color: p.onSurface, fontSize: px(16), fontWeight: '600' }}>
                {it.title}
              </text>
              <text style={{ color: p.onSurfaceVariant, fontSize: px(13) }}>{it.subtitle}</text>
            </view>
          </Card>
        ))}
      </view>
    </scroll-view>
  )
}

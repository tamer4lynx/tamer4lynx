import type { ReactNode } from '@lynx-js/react'
import { useCallback } from '@lynx-js/react'
import { Button, Card, px } from '@tamer4lynx/tamer-app-shell'
import { useTamerNavigate, useTamerStateSnapshot } from '@tamer4lynx/tamer-router'

import { pageShellStyle, useExamplePalette } from './examplePalette.js'

export interface ConnectorDemoPageProps {
  syncKey: string
  title: string
  description: string
  detailPath: string
  detailLabel?: string
  liveValue: ReactNode
  actions: ReactNode
}

export function ConnectorDemoPage({
  syncKey,
  title,
  description,
  detailPath,
  detailLabel = 'Push detail (new LynxView)',
  liveValue,
  actions,
}: ConnectorDemoPageProps) {
  const p = useExamplePalette()
  const { push } = useTamerNavigate()
  const snapshot = useTamerStateSnapshot(syncKey)

  const goDetail = useCallback(() => {
    'background only'
    push(detailPath)
  }, [push, detailPath])

  return (
    <scroll-view scroll-y style={pageShellStyle(p.background)}>
      <view style={{ padding: px(16), gap: px(12), display: 'flex', flexDirection: 'column' }}>
        <text style={{ color: p.onSurface, fontSize: px(20), fontWeight: '600' }}>{title}</text>
        <text style={{ color: p.onSurfaceVariant, fontSize: px(13), lineHeight: px(18) }}>
          {description}
        </text>

        <Card variant="filled">
          <view style={{ display: 'flex', flexDirection: 'column', gap: px(6) }}>
            <text style={{ color: p.onSurfaceVariant, fontSize: px(12), fontWeight: '600' }}>
              Live value (this LynxView)
            </text>
            {liveValue}
          </view>
        </Card>

        <Card variant="outlined">
          <view style={{ display: 'flex', flexDirection: 'column', gap: px(6) }}>
            <text style={{ color: p.onSurfaceVariant, fontSize: px(12), fontWeight: '600' }}>
              Connector snapshot ({syncKey})
            </text>
            <text style={{ color: p.onSurface, fontSize: px(12), fontFamily: 'monospace' }}>
              {JSON.stringify(snapshot ?? null)}
            </text>
          </view>
        </Card>

        {actions}

        <Button label={detailLabel} variant="filled" onTap={goDetail} style={{ width: '100%' }} />
      </view>
    </scroll-view>
  )
}

export interface ConnectorDetailPageProps {
  syncKey: string
  title: string
  liveValue: ReactNode
}

export function ConnectorDetailPage({ syncKey, title, liveValue }: ConnectorDetailPageProps) {
  const p = useExamplePalette()
  const snapshot = useTamerStateSnapshot(syncKey)

  return (
    <scroll-view scroll-y style={pageShellStyle(p.background)}>
      <view style={{ padding: px(16), gap: px(12), display: 'flex', flexDirection: 'column' }}>
        <text style={{ color: p.onSurface, fontSize: px(18), fontWeight: '600' }}>{title}</text>
        <text style={{ color: p.onSurfaceVariant, fontSize: px(13), lineHeight: px(18) }}>
          Hydrated by tamer-router via key &quot;{syncKey}&quot;. If the value below matches what you
          set on the parent screen, the bridge is working across LynxView boundaries.
        </text>

        <Card variant="filled">
          <view style={{ display: 'flex', flexDirection: 'column', gap: px(6) }}>
            <text style={{ color: p.onSurfaceVariant, fontSize: px(12), fontWeight: '600' }}>
              Live value (this LynxView)
            </text>
            {liveValue}
          </view>
        </Card>

        <Card variant="outlined">
          <view style={{ display: 'flex', flexDirection: 'column', gap: px(6) }}>
            <text style={{ color: p.onSurfaceVariant, fontSize: px(12), fontWeight: '600' }}>
              Connector snapshot ({syncKey})
            </text>
            <text style={{ color: p.onSurface, fontSize: px(12), fontFamily: 'monospace' }}>
              {JSON.stringify(snapshot ?? null)}
            </text>
          </view>
        </Card>
      </view>
    </scroll-view>
  )
}

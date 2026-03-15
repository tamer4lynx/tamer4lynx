import { useCallback, useState } from '@lynx-js/react'
import { openBrowserAsync, openAuthSessionAsync } from 'tamer-display-browser'
import type { AuthSessionResult } from 'tamer-display-browser'
import { px } from 'tamer-app-shell'

export default function BrowserPage() {
  const [status, setStatus] = useState<string>('')

  const onOpenBrowser = useCallback(() => {
    openBrowserAsync('https://example.com').then((r: { type: string }) => setStatus(r.type === 'opened' ? 'Opened' : r.type))
  }, [])

  const onOpenAuthSession = useCallback(() => {
    setStatus('Opening...')
    openAuthSessionAsync('https://example.com', 'tamerdevapp://auth/callback').then((r: AuthSessionResult) => {
      if (r.type === 'success') setStatus(`Success: ${r.url?.slice(0, 40)}...`)
      else setStatus(r.type)
    })
  }, [])

  return (
    <view style={{ padding: px(32), display: 'flex', flexDirection: 'column', gap: px(24) }}>
      <view style={{ padding: px(8), backgroundColor: '#555', borderRadius: px(6), display: 'flex', flexDirection: 'column', gap: px(8) }} bindtap={onOpenBrowser}>
        <text style={{ fontSize: px(18) }}>openBrowserAsync</text>
      </view>
      <view style={{ padding: px(8), backgroundColor: '#555', borderRadius: px(6), display: 'flex', flexDirection: 'column', gap: px(8) }} bindtap={onOpenAuthSession}>
        <text style={{ fontSize: px(18) }}>openAuthSessionAsync</text>
      </view>
      {status ? <text style={{ fontSize: px(18), color: '#aaa' }}>{status}</text> : null}
    </view>
  )
}

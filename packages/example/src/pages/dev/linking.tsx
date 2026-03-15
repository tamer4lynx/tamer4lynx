import { useCallback, useEffect, useState } from '@lynx-js/react'
import { createURL, getInitialURL, addEventListener } from 'tamer-linking'
import { px } from 'tamer-app-shell'

export default function LinkingPage() {
  const [createUrlResult, setCreateUrlResult] = useState<string>('')
  const [initialUrlResult, setInitialUrlResult] = useState<string>('')
  const [lastUrl, setLastUrl] = useState<string>('')

  const onCreateUrl = useCallback(() => {
    const url = createURL('test', { scheme: 'tamerdevapp' })
    setCreateUrlResult(url)
  }, [])

  const onGetInitialUrl = useCallback(() => {
    getInitialURL().then((url: string | null) => setInitialUrlResult(url ?? '(null)'))
  }, [])

  useEffect(() => {
    const sub = addEventListener('url', (e: { url?: string }) => setLastUrl(e.url ?? ''))
    return () => sub.remove()
  }, [])

  return (
    <view style={{ padding: px(32), display: 'flex', flexDirection: 'column', gap: px(24) }}>
      <view style={{ padding: px(8), backgroundColor: '#555', borderRadius: px(6), display: 'flex', flexDirection: 'column', gap: px(8) }} bindtap={onCreateUrl}>
        <text style={{ fontSize: px(18) }}>createURL</text>
      </view>
      {createUrlResult ? <text style={{ fontSize: px(18), color: '#aaa', wordBreak: 'break-all' }}>{createUrlResult}</text> : null}
      <view style={{ padding: px(8), backgroundColor: '#555', borderRadius: px(6), display: 'flex', flexDirection: 'column', gap: px(8) }} bindtap={onGetInitialUrl}>
        <text style={{ fontSize: px(18) }}>getInitialURL</text>
      </view>
      {initialUrlResult ? <text style={{ fontSize: px(18), color: '#aaa', wordBreak: 'break-all' }}>{initialUrlResult}</text> : null}
      <text style={{ fontSize: px(18), color: '#aaa' }}>addEventListener (url): {lastUrl || 'waiting...'}</text>
    </view>
  )
}

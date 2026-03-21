import { useCallback, useState } from '@lynx-js/react'
import { WebView } from '@tamer4lynx/tamer-webview'
import { px } from '@tamer4lynx/tamer-app-shell'

export default function WebViewPage() {
  const [status, setStatus] = useState('')

  const onLoad = useCallback((e: { detail: { url: string; title: string } }) => {
    'background only'
    setStatus(`Loaded: ${e.detail.title || e.detail.url}`)
  }, [])

  return (
    <view style={{ padding: px(16), display: 'flex', flexDirection: 'column', gap: px(12), flex: 1 }}>
      <text style={{ fontSize: px(14), color: '#aaa' }}>
        In-page WebView (native webview tag). Requires `t4l link` and native registration.
      </text>
      {status ? <text style={{ fontSize: px(14), color: '#8f8' }}>{status}</text> : null}
      <WebView
        uri="https://example.com"
        style={{ width: '100%', height: px(360), backgroundColor: '#222' }}
        bindload={onLoad}
      />
    </view>
  )
}

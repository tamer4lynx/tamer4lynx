import { useCallback } from '@lynx-js/react'
import { useTamerRouter } from 'tamer-router'
import { px } from 'tamer-app-shell'

export default function DevIndex() {
  const { push } = useTamerRouter()

  const goLinking = useCallback(() => { 'background only'; push('/dev/linking') }, [push])
  const goBrowser = useCallback(() => { 'background only'; push('/dev/browser') }, [push])
  const goAuth = useCallback(() => { 'background only'; push('/dev/auth') }, [push])

  return (
    <view style={{ padding: px(32), display: 'flex', flexDirection: 'column', gap: px(24) }}>
      <view style={{ padding: px(8), backgroundColor: '#555', borderRadius: px(6), display: 'flex', flexDirection: 'column', gap: px(8) }} bindtap={goLinking}>
        <text style={{ fontSize: px(18) }}>tamer-linking</text>
        <text style={{ fontSize: px(18), color: '#aaa' }}>createURL, getInitialURL, addEventListener</text>
      </view>
      <view style={{ padding: px(8), backgroundColor: '#555', borderRadius: px(6), display: 'flex', flexDirection: 'column', gap: px(8) }} bindtap={goBrowser}>
        <text style={{ fontSize: px(18) }}>tamer-display-browser</text>
        <text style={{ fontSize: px(18), color: '#aaa' }}>openBrowserAsync, openAuthSessionAsync</text>
      </view>
      <view style={{ padding: px(8), backgroundColor: '#555', borderRadius: px(6), display: 'flex', flexDirection: 'column', gap: px(8) }} bindtap={goAuth}>
        <text style={{ fontSize: px(18) }}>OAuth</text>
        <text style={{ fontSize: px(18), color: '#aaa' }}>Authorization code flow</text>
      </view>
    </view>
  )
}

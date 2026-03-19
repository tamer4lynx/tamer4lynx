import { useState } from '@lynx-js/react'
import { useInsets, useKeyboard } from '@tamer4lynx/tamer-insets'

export default function InsetsPage() {
  const insets = useInsets()
  const keyboard = useKeyboard()
  const [inputValue, setInputValue] = useState('')

  return (
    <view style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>

      <scroll-view style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
        <view style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #333' }}>
          <text style={{ fontWeight: 'bold', color: '#fff', marginBottom: 12, borderBottom: '1px solid #333', paddingBottom: 8 }}>Keyboard State</text>
          <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <text style={{ color: '#aaa' }}>Bottom:</text>
            <text style={{ color: '#fff', fontWeight: '500' }}>{keyboard.height.toFixed(1)}</text>
          </view>
          <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <text style={{ color: '#aaa' }}>Visible:</text>
            <text style={{ color: '#fff', fontWeight: '500' }}>{keyboard.visible ? 'True' : 'False'}</text>
          </view>
          <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <text style={{ color: '#aaa' }}>Height:</text>
            <text style={{ color: '#fff', fontWeight: '500' }}>{keyboard.height.toFixed(1)}</text>
          </view>
        </view>

        <view style={{ marginTop: 20 }}>
          <input
            value={inputValue}
            placeholder="Tap here to show keyboard"
            enable-scroll-bar
            style={{ backgroundColor: '#222', color: '#ffffff', borderRadius: '12px', border: '1px solid #444', height: '48px', padding: '8px' }}
            bindinput={(e) => setInputValue(e.detail.value)}
          />
        </view>

        <view style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #333', marginTop: 20 }}>
          <text style={{ fontWeight: 'bold', color: '#fff', marginBottom: 12, borderBottom: '1px solid #333', paddingBottom: 8 }}>Safe Area Insets</text>
          <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <text style={{ color: '#aaa' }}>Top:</text>
            <text style={{ color: '#fff', fontWeight: '500' }}>{insets.top.toFixed(1)}</text>
          </view>
          <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <text style={{ color: '#aaa' }}>Bottom:</text>
            <text style={{ color: '#fff', fontWeight: '500' }}>{insets.bottom.toFixed(1)}</text>
          </view>
          <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <text style={{ color: '#aaa' }}>Left:</text>
            <text style={{ color: '#fff', fontWeight: '500' }}>{insets.left.toFixed(1)}</text>
          </view>
          <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <text style={{ color: '#aaa' }}>Right:</text>
            <text style={{ color: '#fff', fontWeight: '500' }}>{insets.right.toFixed(1)}</text>
          </view>
        </view>
      </scroll-view>

      <view
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingRight: 16,
          paddingTop: 20,
          paddingBottom: insets.bottom,
          paddingLeft: 16,
          backgroundColor: keyboard.visible ? '#ff4444' : '#4444ff',
          transition: 'background-color 0.2s ease',
        }}
      >
        <text style={{ color: '#fff', fontWeight: 'bold' }}>
          {keyboard.visible ? 'Keyboard is Visible' : 'Keyboard is Hidden'}
        </text>
      </view>
    </view>
  )
}

import { useState } from '@lynx-js/react'
import { Screen, SafeArea, AvoidKeyboard, AppBar, useInsets, useKeyboard } from 'tamer-screen'

export default function ScreenPage() {
  const insets = useInsets()
  const keyboard = useKeyboard()
  const [inputValue, setInputValue] = useState('')

  const handleInput = (e: { value?: string; detail?: { value?: string } }) => {
    setInputValue(e.detail?.value ?? e.value ?? '')
  }

  const appBarHeight = 56
  return (
    <Screen style={{ backgroundColor: 'green' }}>
      <SafeArea edges={['top', 'left', 'right', 'bottom']} style={{ backgroundColor: 'purple' }}>
        <AppBar barHeight={appBarHeight} style={{ backgroundColor: 'blue', paddingLeft: '16px', paddingRight: '16px' }}>
          <text style={{ color: '#fff', fontWeight: 'bold' }}>tamer-screen</text>
          <text style={{ color: '#888', marginTop: '4px' }}>Screen + SafeArea + AvoidKeyboard</text>
        </AppBar>
        <view style={{ minHeight: `${appBarHeight}px` }} />
        <scroll-view scroll-y style={{ minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
          <view style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'red', paddingLeft: '16px', paddingRight: '16px', height: '100%' }}>
            <view style={{ backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #333' }}>
              <text style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>Insets (raw px)</text>
              <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '4px' }}>
                <text style={{ color: '#aaa' }}>Top:</text>
                <text style={{ color: '#fff', fontWeight: '500' }}>{insets.top.toFixed(0)}</text>
              </view>
              <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '4px' }}>
                <text style={{ color: '#aaa' }}>Bottom:</text>
                <text style={{ color: '#fff', fontWeight: '500' }}>{insets.bottom.toFixed(0)}</text>
              </view>
              <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '4px' }}>
                <text style={{ color: '#aaa' }}>Left:</text>
                <text style={{ color: '#fff', fontWeight: '500' }}>{insets.left.toFixed(0)}</text>
              </view>
              <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <text style={{ color: '#aaa' }}>Right:</text>
                <text style={{ color: '#fff', fontWeight: '500' }}>{insets.right.toFixed(0)}</text>
              </view>
            </view>

            <view style={{ backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #333' }}>
              <text style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>Keyboard</text>
              <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '4px' }}>
                <text style={{ color: '#aaa' }}>Visible:</text>
                <text style={{ color: keyboard.visible ? '#4f4' : '#f44', fontWeight: '500' }}>{keyboard.visible ? 'Yes' : 'No'}</text>
              </view>
              <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <text style={{ color: '#aaa' }}>Height:</text>
                <text style={{ color: '#fff', fontWeight: '500' }}>{keyboard.height.toFixed(0)}</text>
              </view>
            </view>

            <view style={{ backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #333' }}>
              <text style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>About these components</text>
              <text style={{ color: '#aaa', lineHeight: '24px' }}>
                {'<Screen> is the root full-screen container.\n<SafeArea> adds inset padding to clear the status bar and home indicator.\n<AvoidKeyboard> shifts content above the keyboard.'}
              </text>
            </view>
          </view>


        </scroll-view>

<view style={{ backgroundColor: 'yellow', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
  <AvoidKeyboard behavior="padding">
    <view style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: `${insets.bottom || 16}px`, backgroundColor: '#1a1a1a', borderTop: '1px solid #333' }}>
      <explorer-input
        style={{ backgroundColor: '#222', height: '72px', border: '1px solid #444', borderRadius: '8px', padding: '12px', color: '#fff' }}
        placeholder="Type to test AvoidKeyboard..."
        value={inputValue}
        bindinput={handleInput}
      />
    </view>
  </AvoidKeyboard>
</view>
      </SafeArea>
    </Screen>
  )
}

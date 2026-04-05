import { useState } from '@lynx-js/react'
import { px } from '@tamer4lynx/tamer-app-shell'
import { Screen, SafeArea, AvoidKeyboard, useInsets, useKeyboard } from '@tamer4lynx/tamer-screen'

import { useExamplePalette } from '../examplePalette.js'

function ScreenPage() {
  const p = useExamplePalette()
  const cardBg = p.surfaceContainer
  const border = 'rgba(255,255,255,0.12)'
  const MIN_INPUT_HEIGHT = 96
  const MAX_INPUT_HEIGHT = 320
  const insets = useInsets()
  const keyboard = useKeyboard()
  const [inputValue, setInputValue] = useState('')
  return (
    <view style={{ display: 'flex', flexDirection: 'column', zIndex: 100, height: '100%', minHeight: 0, backgroundColor: p.surface }}>
      <scroll-view scroll-y style={{ display: 'flex', flexDirection: 'column', flex: 1, flexGrow: 1, flexShrink: 1, minHeight: 0 }}>


        <view style={{ display: 'flex', flexDirection: 'column', padding: '16px 16px', height: '100%', justifyContent: 'flex-start', gap: '12px' }}>



          <view style={{ display: 'flex', flex: "0 1 auto", minHeight: "8rem", flexDirection: 'column', backgroundColor: cardBg, borderRadius: '12px', padding: '16px', marginBottom: '12px', border: `1px solid ${border}` }}>
            <text style={{ color: p.onSurface, fontWeight: 'bold', marginBottom: '8px' }}>Insets (raw px)</text>
            <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '4px' }}>
              <text style={{ color: p.onSurfaceVariant }}>Top:</text>
              <text style={{ color: p.onSurface, fontWeight: '500' }}>{insets.top.toFixed(0)}</text>
            </view>
            <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '4px' }}>
              <text style={{ color: p.onSurfaceVariant }}>Bottom:</text>
              <text style={{ color: p.onSurface, fontWeight: '500' }}>{insets.bottom.toFixed(0)}</text>
            </view>
            <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '4px' }}>
              <text style={{ color: p.onSurfaceVariant }}>Left:</text>
              <text style={{ color: p.onSurface, fontWeight: '500' }}>{insets.left.toFixed(0)}</text>
            </view>
            <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              <text style={{ color: p.onSurfaceVariant }}>Right:</text>
              <text style={{ color: p.onSurface, fontWeight: '500' }}>{insets.right.toFixed(0)}</text>
            </view>
          </view>

          <view style={{ display: 'flex', flex: "0 1 auto", minHeight: "7rem", flexDirection: 'column', backgroundColor: cardBg, borderRadius: '12px', padding: '16px', marginBottom: '12px', border: `1px solid ${border}` }}>
            <text style={{ color: p.onSurface, fontWeight: 'bold', marginBottom: '8px' }}>Keyboard</text>
            <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '4px' }}>
              <text style={{ color: p.onSurfaceVariant }}>Visible:</text>
              <text style={{ color: keyboard.visible ? '#4f4' : '#f44', fontWeight: '500' }}>{keyboard.visible ? 'Yes' : 'No'}</text>
            </view>
            <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              <text style={{ color: p.onSurfaceVariant }}>Height:</text>
              <text style={{ color: p.onSurface, fontWeight: '500' }}>{keyboard.height.toFixed(0)}</text>
            </view>
          </view>

          <view style={{ display: 'flex', flex: "0 1 auto", minHeight: "10rem", flexDirection: 'column', backgroundColor: cardBg, borderRadius: '12px', padding: '16px', marginBottom: '12px', border: `1px solid ${border}` }}>
            <text style={{ color: p.onSurface, fontWeight: 'bold', marginBottom: '8px' }}>About these components</text>
            <text style={{ color: p.onSurfaceVariant, lineHeight: '24px' }}>
              {'<Screen> is the root full-screen container.\n<SafeArea> adds inset padding to clear the status bar and home indicator.\n<AvoidKeyboard> shifts content above the keyboard.'}
            </text>
          </view>
        </view>

      </scroll-view>

      <AvoidKeyboard 
      style={{ backgroundColor: 'transparent' }}
      behavior="padding">
        <view style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            flexShrink: 0, 
            paddingLeft: '16px', 
            paddingRight: '16px', 
            paddingTop: '12px', 
            paddingBottom: '12px',
            backgroundColor: cardBg, 
            borderTop: `1px solid ${border}` 
          }}>
          <input
            value={inputValue}
            placeholder="Type to test AvoidKeyboard..."
            enable-scroll-bar
            style={{ backgroundColor: p.surface, color: p.onSurface, borderRadius: '12px', border: `1px solid ${border}`, height: '48px', padding: '8px' }}
            bindinput={(e) => {
              'background only'
              setInputValue(e.detail.value)
            }}
          />
        </view>
      </AvoidKeyboard>
    </view>
  )
}

export default ScreenPage

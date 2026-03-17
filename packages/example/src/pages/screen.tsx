import { useState } from '@lynx-js/react'
import { px } from '@tamer4lynx/tamer-app-shell'
import { Screen, SafeArea, AvoidKeyboard, useInsets, useKeyboard } from '@tamer4lynx/tamer-screen'

export default function ScreenPage() {
  const MIN_INPUT_HEIGHT = 96
  const MAX_INPUT_HEIGHT = 320
  const insets = useInsets()
  const keyboard = useKeyboard()
  const [inputValue, setInputValue] = useState('')
  const [inputHeight, setInputHeight] = useState<number>(MIN_INPUT_HEIGHT)

  const appBarHeight = 275
  return (
    <view style={{ display: 'flex', flexDirection: 'column', zIndex: 100, height: '100%', minHeight: 0 }}>
      <scroll-view scroll-y style={{ display: 'flex', flexDirection: 'column', flex: 1, flexGrow: 1, flexShrink: 1, minHeight: 0 }}>


        <view style={{ display: 'flex', flexDirection: 'column', padding: '16px 16px', height: '100%', justifyContent: 'flex-start', gap: '12px' }}>



          <view style={{ display: 'flex', flex: "0 1 auto", minHeight: "8rem", flexDirection: 'column', backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #333' }}>
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

          <view style={{ display: 'flex', flex: "0 1 auto", minHeight: "7rem", flexDirection: 'column', backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #333' }}>
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

          <view style={{ display: 'flex', flex: "0 1 auto", minHeight: "10rem", flexDirection: 'column', backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #333' }}>
            <text style={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}>About these components</text>
            <text style={{ color: '#aaa', lineHeight: '24px' }}>
              {'<Screen> is the root full-screen container.\n<SafeArea> adds inset padding to clear the status bar and home indicator.\n<AvoidKeyboard> shifts content above the keyboard.'}
            </text>
          </view>
        </view>

      </scroll-view>

      <AvoidKeyboard behavior="padding">
        <view style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', backgroundColor: '#1a1a1a', borderTop: '1px solid #333' }}>
          <tamer-input
            multiline
            value={inputValue}
            placeholder="Type to test AvoidKeyboard..."
            color="#ffffff"
            placeholder-color="#777777"
            style={{ backgroundColor: '#222', borderRadius: '12px', border: '1px solid #444', height: inputHeight, minHeight: MIN_INPUT_HEIGHT, maxHeight: MAX_INPUT_HEIGHT, padding: '8px' }}
            bindinput={(e: { detail?: { value?: string }; value?: string }) => {
              'background only'
              setInputValue(e?.detail?.value ?? e?.value ?? '')
            }}
            bindcontentsizechange={(e: { detail?: { height?: number } }) => {
              'background only'
              const h = (e?.detail?.height ?? 0) + (8 * 4) || MIN_INPUT_HEIGHT
              if (h > 0) setInputHeight(h < MIN_INPUT_HEIGHT ? MIN_INPUT_HEIGHT : h )
            }}
          />
        </view>
      </AvoidKeyboard>
    </view>
  )
}

import { useState } from '@lynx-js/react';
import { useInsets, useKeyboard } from '@tamer4lynx/tamer-insets';

import { pageShellStyle, useExamplePalette } from '../../examplePalette.js';

export default function InsetsPage() {
  const p = useExamplePalette();
  const insets = useInsets();
  const keyboard = useKeyboard();
  const [inputValue, setInputValue] = useState('');
  const cardBg = p.surfaceContainer;
  const border = 'rgba(255,255,255,0.12)';

  return (
    <view style={pageShellStyle(p.surface)}>
      <scroll-view
        scroll-y
        style={{
          flex: 1,
          minHeight: '0px',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <view
          style={{
            backgroundColor: cardBg,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            border: `1px solid ${border}`,
          }}
        >
          <text
            style={{
              fontWeight: 'bold',
              color: p.onSurface,
              marginBottom: 12,
              borderBottom: `1px solid ${border}`,
              paddingBottom: 8,
            }}
          >
            Keyboard State
          </text>
          <view
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <text style={{ color: p.onSurfaceVariant }}>Bottom:</text>
            <text style={{ color: p.onSurface, fontWeight: '500' }}>
              {keyboard.height.toFixed(1)}
            </text>
          </view>
          <view
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <text style={{ color: p.onSurfaceVariant }}>Visible:</text>
            <text style={{ color: p.onSurface, fontWeight: '500' }}>
              {keyboard.visible ? 'True' : 'False'}
            </text>
          </view>
          <view
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <text style={{ color: p.onSurfaceVariant }}>Height:</text>
            <text style={{ color: p.onSurface, fontWeight: '500' }}>
              {keyboard.height.toFixed(1)}
            </text>
          </view>
        </view>

        <view style={{ marginTop: 20 }}>
          <input
            value={inputValue}
            placeholder="Tap here to show keyboard"
            enable-scroll-bar
            style={{
              backgroundColor: cardBg,
              color: p.onSurface,
              borderRadius: '12px',
              border: `1px solid ${border}`,
              height: '48px',
              padding: '8px',
            }}
            bindinput={(e) => setInputValue(e.detail.value)}
          />
        </view>

        <view
          style={{
            backgroundColor: cardBg,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            border: `1px solid ${border}`,
            marginTop: 20,
          }}
        >
          <text
            style={{
              fontWeight: 'bold',
              color: p.onSurface,
              marginBottom: 12,
              borderBottom: `1px solid ${border}`,
              paddingBottom: 8,
            }}
          >
            Safe Area Insets
          </text>
          <view
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <text style={{ color: p.onSurfaceVariant }}>Top:</text>
            <text style={{ color: p.onSurface, fontWeight: '500' }}>
              {insets.top.toFixed(1)}
            </text>
          </view>
          <view
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <text style={{ color: p.onSurfaceVariant }}>Bottom:</text>
            <text style={{ color: p.onSurface, fontWeight: '500' }}>
              {insets.bottom.toFixed(1)}
            </text>
          </view>
          <view
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <text style={{ color: p.onSurfaceVariant }}>Left:</text>
            <text style={{ color: p.onSurface, fontWeight: '500' }}>
              {insets.left.toFixed(1)}
            </text>
          </view>
          <view
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <text style={{ color: p.onSurfaceVariant }}>Right:</text>
            <text style={{ color: p.onSurface, fontWeight: '500' }}>
              {insets.right.toFixed(1)}
            </text>
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
        <text style={{ color: p.onSurface, fontWeight: 'bold' }}>
          {keyboard.visible ? 'Keyboard is Visible' : 'Keyboard is Hidden'}
        </text>
      </view>
    </view>
  );
}

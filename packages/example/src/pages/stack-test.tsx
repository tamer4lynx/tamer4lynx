import { useCallback, useState } from '@lynx-js/react'
import '@tamer4lynx/tamer-stack'

export default function StackTest() {
  const [detailVisible, setDetailVisible] = useState(false)

  const openDetail = useCallback(() => {
    'background only'
    setDetailVisible(true)
  }, [])

  const closeDetail = useCallback(() => {
    'background only'
    setDetailVisible(false)
  }, [])

  return (
    <view style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <view style={{ padding: 24 }}>
        <text style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16 }}>
          Stack Screen Test
        </text>
        <text style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
          Tap the button to push a native stack screen. No bitmap is captured.
        </text>
        <view
          bindtap={openDetail}
          style={{
            backgroundColor: '#6200EE',
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
          }}
        >
          <text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            Push Detail Screen
          </text>
        </view>
      </view>

      {'stack-screen' in globalThis ? null : (
        <view style={{ padding: 16 }}>
          <text style={{ color: '#999', fontSize: 12 }}>
            (stack-screen element registered via TamerStackModule)
          </text>
        </view>
      )}

      <stack-screen screen-id="stack-test-detail" visible={detailVisible}>
        <view style={{ flex: 1, backgroundColor: '#fff' }}>
          <view
            style={{
              backgroundColor: '#6200EE',
              padding: 16,
              paddingTop: 48,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <view
              bindtap={closeDetail}
              style={{ marginRight: 16, padding: 8 }}
            >
              <text style={{ color: '#fff', fontSize: 16 }}>← Back</text>
            </view>
            <text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              Detail Screen
            </text>
          </view>
          <view style={{ padding: 24 }}>
            <text style={{ fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 }}>
              Native Stack Navigation
            </text>
            <text style={{ fontSize: 14, color: '#444', lineHeight: 22 }}>
              This screen is rendered in a FrameLayout sibling to the LynxView.
              The push/pop animations run on live views — zero bitmap allocation.
              React context, state, and hooks all work normally since this is
              the same JS tree as the main bundle.
            </text>
          </view>
        </view>
      </stack-screen>
    </view>
  )
}

import { useCallback, useState } from '@lynx-js/react'

const overlay = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 100,
}

export default function StackTest() {
  const [detailVisible, setDetailVisible] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)

  const openDetail = useCallback(() => {
    'background only'
    setDetailVisible(true)
  }, [])

  const closeDetail = useCallback(() => {
    'background only'
    setDetailVisible(false)
  }, [])

  const openModal = useCallback(() => {
    'background only'
    setModalVisible(true)
  }, [])

  const closeModal = useCallback(() => {
    'background only'
    setModalVisible(false)
  }, [])

  return (
    <view style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <view style={{ padding: 24 }}>
        <text style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16 }}>
          Navigation Test
        </text>
        <text style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
          Tap buttons below. Overlays use plain views (install @tamer4lynx/tamer-navigation for native
          nav-screen transitions).
        </text>

        <view
          bindtap={openDetail}
          style={{ backgroundColor: '#6200EE', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 12 }}
        >
          <text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            Push (slide-right)
          </text>
        </view>

        <view
          bindtap={openModal}
          style={{ backgroundColor: '#018786', borderRadius: 8, padding: 16, alignItems: 'center' }}
        >
          <text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            Modal (slide-up)
          </text>
        </view>
      </view>

      {detailVisible ? (
        <view style={overlay}>
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
              <view bindtap={closeDetail} style={{ marginRight: 16, padding: 8 }}>
                <text style={{ color: '#fff', fontSize: 16 }}>← Back</text>
              </view>
              <text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Detail Screen</text>
            </view>
            <view style={{ padding: 24 }}>
              <text style={{ fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 }}>
                slide-right transition
              </text>
              <text style={{ fontSize: 14, color: '#444', lineHeight: 22 }}>
                Overlay demo — add tamer-navigation for native transitions.
              </text>
            </view>
          </view>
        </view>
      ) : null}

      {modalVisible ? (
        <view style={overlay}>
          <view style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16 }}>
            <view style={{ padding: 24, paddingTop: 48 }}>
              <text style={{ fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 }}>
                Modal Sheet
              </text>
              <text style={{ fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 32 }}>
                Overlay demo — add tamer-navigation for native sheet behavior.
              </text>
              <view
                bindtap={closeModal}
                style={{ backgroundColor: '#018786', borderRadius: 8, padding: 16, alignItems: 'center' }}
              >
                <text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Dismiss</text>
              </view>
            </view>
          </view>
        </view>
      ) : null}
    </view>
  )
}

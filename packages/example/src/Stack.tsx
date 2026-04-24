import '@lynx-js/react/debug'
import '@tamer4lynx/tamer-transports/lynx'
import '@tamer4lynx/tamer-navigation'
import { useState, useCallback, useEffect } from '@lynx-js/react'
import { SafeArea, Screen, useInsets } from '@tamer4lynx/tamer-screen'
import { BackHandlerRoot, useBackHandler } from '@tamer4lynx/tamer-router'

type StackScreenId = 'a' | 'b' | 'c' | 'd' | 'e'

const SCREEN_META: Record<StackScreenId, { label: string; color: string }> = {
  a: { label: 'A', color: '#6200EE' },
  b: { label: 'B', color: '#018786' },
  c: { label: 'C', color: '#1565C0' },
  d: { label: 'D', color: '#6A1B9A' },
  e: { label: 'E', color: '#BF360C' },
}

function InsetsDebug() {
  const insets = useInsets()
  useEffect(() => {
    console.log('[InsetsDebug]', JSON.stringify(insets))
  }, [insets])
  return (
    <text style={{ color: '#ff0', fontSize: '22rpx', marginBottom: '16rpx' }}>
      insets: t={insets.top} r={insets.right} b={insets.bottom} l={insets.left}
    </text>
  )
}

function stackOrderFor(
  id: StackScreenId,
  visible: Record<StackScreenId, boolean>,
): number {
  const stack = (['a', 'b', 'c', 'd', 'e'] as const).filter(k => visible[k])
  const idx = stack.indexOf(id)
  return idx >= 0 ? idx : 0
}

function PeerStackButtons({
  current,
  openScreen,
  btn,
}: {
  current: StackScreenId | 'root'
  openScreen: (id: StackScreenId) => void
  btn: {
    paddingLeft: string
    paddingRight: string
    paddingTop: string
    paddingBottom: string
    minHeight: string
    borderRadius: string
    marginBottom: string
    display: 'flex'
    alignItems: 'center'
    justifyContent: 'center'
  }
}) {
  const peers = (['a', 'b', 'c', 'd', 'e'] as const).filter(id => id !== current)
  return (
    <>
      {peers.map((id, i) => {
        const m = SCREEN_META[id]
        return (
          <view
            key={id}
            bindtap={() => {
              'background only'
              openScreen(id)
            }}
            style={{ ...btn, backgroundColor: m.color, marginBottom: i === peers.length - 1 ? '0' : '24rpx' }}
          >
            <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>
              Open {m.label}
            </text>
          </view>
        )
      })}
    </>
  )
}

function NavScreenDirectTest() {
  const [showA, setShowA] = useState(false)
  const [showB, setShowB] = useState(false)
  const [showC, setShowC] = useState(false)
  const [showD, setShowD] = useState(false)
  const [showE, setShowE] = useState(false)

  const visible = { a: showA, b: showB, c: showC, d: showD, e: showE }

  const onHardwareBack = useCallback((): boolean => {
    'background only'
    if (showE) {
      setShowE(false)
      return true
    }
    if (showD) {
      setShowD(false)
      return true
    }
    if (showC) {
      setShowC(false)
      return true
    }
    if (showB) {
      setShowB(false)
      return true
    }
    if (showA) {
      setShowA(false)
      return true
    }
    return false
  }, [showA, showB, showC, showD, showE])

  useBackHandler(onHardwareBack)

  const toggleA = useCallback(() => {
    'background only'
    console.log('[toggleA]', showA)
    setShowA(v => !v)
  }, [showA])

  const toggleB = useCallback(() => {
    'background only'
    console.log('[toggleB]', showB)
    setShowB(v => !v)
  }, [showB])

  const toggleC = useCallback(() => {
    'background only'
    console.log('[toggleC]', showC)
    setShowC(v => !v)
  }, [showC])

  const toggleD = useCallback(() => {
    'background only'
    console.log('[toggleD]', showD)
    setShowD(v => !v)
  }, [showD])

  const toggleE = useCallback(() => {
    'background only'
    console.log('[toggleE]', showE)
    setShowE(v => !v)
  }, [showE])

  const openScreen = useCallback((id: StackScreenId) => {
    'background only'
    switch (id) {
      case 'a':
        setShowA(true)
        break
      case 'b':
        setShowB(true)
        break
      case 'c':
        setShowC(true)
        break
      case 'd':
        setShowD(true)
        break
      case 'e':
        setShowE(true)
        break
    }
  }, [])

  const btn = {
    paddingLeft: '40rpx',
    paddingRight: '40rpx',
    paddingTop: '32rpx',
    paddingBottom: '32rpx',
    minHeight: '112rpx',
    borderRadius: '16rpx',
    marginBottom: '24rpx',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }

  return (
    <>
      <Screen style={{ backgroundColor: '#121212' }}>
        <SafeArea
          style={{
            backgroundColor: '#121212',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          edges={['top', 'bottom', 'left', 'right']}
        >
          <scroll-view
            scroll-y
            style={{
              flex: 1,
              minHeight: '0px',
              display: 'flex',
              flexDirection: 'column',
              padding: '48rpx',
            }}
          >
            <text style={{ color: '#fff', fontSize: '44rpx', fontWeight: 'bold', marginBottom: '16rpx' }}>
              nav-screen DIRECT test
            </text>
            <InsetsDebug />

            <text style={{ color: '#aaa', fontSize: '26rpx', marginBottom: '24rpx' }}>
              Root: tap to toggle each screen (stack underlays). From any screen, open others to build a multi-level stack.
            </text>

            <view bindtap={toggleA} style={{ ...btn, backgroundColor: SCREEN_META.a.color }}>
              <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>Toggle A (slide-right)</text>
            </view>
            <view bindtap={toggleB} style={{ ...btn, backgroundColor: SCREEN_META.b.color }}>
              <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>Toggle B (slide-up)</text>
            </view>
            <view bindtap={toggleC} style={{ ...btn, backgroundColor: SCREEN_META.c.color }}>
              <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>Toggle C (slide-left)</text>
            </view>
            <view bindtap={toggleD} style={{ ...btn, backgroundColor: SCREEN_META.d.color }}>
              <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>Toggle D (fade)</text>
            </view>
            <view bindtap={toggleE} style={{ ...btn, backgroundColor: SCREEN_META.e.color, marginBottom: '24rpx' }}>
              <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>Toggle E (slide-right)</text>
            </view>

            <PeerStackButtons current="root" openScreen={openScreen} btn={btn} />
          </scroll-view>
        </SafeArea>
      </Screen>

      <nav-screen
        screen-id="test-e"
        stack-order={stackOrderFor('e', visible)}
        visible={showE}
        nav-transition="slide-right"
      >
        <InsetsDebug />
        <SafeArea style={{ backgroundColor: '#3e2723', height: '100%' }} edges={['top', 'bottom', 'left', 'right']}>
          <text style={{ fontSize: '40rpx', fontWeight: 'bold', color: '#fff', marginBottom: '24rpx', marginLeft: '48rpx' }}>
            Screen E
          </text>
          <scroll-view
            scroll-y
            style={{
              flex: 1,
              minHeight: '0px',
              display: 'flex',
              flexDirection: 'column',
              padding: '48rpx',
            }}
          >
            <view bindtap={toggleE} style={{ ...btn, backgroundColor: '#c62828' }}>
              <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>Close E</text>
            </view>
            <PeerStackButtons current="e" openScreen={openScreen} btn={btn} />
          </scroll-view>
        </SafeArea>
      </nav-screen>

      <nav-screen
        screen-id="test-d"
        stack-order={stackOrderFor('d', visible)}
        visible={showD}
        nav-transition="fade"
      >
        <InsetsDebug />
        <SafeArea
          style={{
            backgroundColor: '#311B92',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          edges={['top', 'bottom', 'left', 'right']}
        >
          <text style={{ fontSize: '40rpx', fontWeight: 'bold', color: '#fff', marginBottom: '24rpx', marginLeft: '48rpx' }}>
            Screen D
          </text>
          <scroll-view
            scroll-y
            style={{
              flex: 1,
              minHeight: '0px',
              display: 'flex',
              flexDirection: 'column',
              padding: '48rpx',
            }}
          >
            <view bindtap={toggleD} style={{ ...btn, backgroundColor: '#c62828' }}>
              <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>Close D</text>
            </view>
            <PeerStackButtons current="d" openScreen={openScreen} btn={btn} />
          </scroll-view>
        </SafeArea>
      </nav-screen>

      <nav-screen
        screen-id="test-c"
        stack-order={stackOrderFor('c', visible)}
        visible={showC}
        nav-transition="slide-left"
      >
        <InsetsDebug />
        <SafeArea
          style={{
            backgroundColor: '#1a237e',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          edges={['top', 'bottom', 'left', 'right']}
        >
          <text style={{ fontSize: '40rpx', fontWeight: 'bold', color: '#fff', marginBottom: '24rpx', marginLeft: '48rpx' }}>
            Screen C
          </text>
          <scroll-view
            scroll-y
            style={{
              flex: 1,
              minHeight: '0px',
              display: 'flex',
              flexDirection: 'column',
              padding: '48rpx',
            }}
          >
            <view bindtap={toggleC} style={{ ...btn, backgroundColor: '#c62828' }}>
              <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>Close C</text>
            </view>
            <PeerStackButtons current="c" openScreen={openScreen} btn={btn} />
          </scroll-view>
        </SafeArea>
      </nav-screen>

      <nav-screen
        screen-id="test-b"
        stack-order={stackOrderFor('b', visible)}
        visible={showB}
        nav-transition="slide-up"
      >
        <InsetsDebug />
        <SafeArea
          style={{
            backgroundColor: '#2e1e1e',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          edges={['top', 'bottom', 'left', 'right']}
        >
          <text style={{ fontSize: '40rpx', fontWeight: 'bold', color: '#fff', marginBottom: '24rpx', marginLeft: '48rpx' }}>
            Screen B
          </text>
          <scroll-view
            scroll-y
            style={{
              flex: 1,
              minHeight: '0px',
              display: 'flex',
              flexDirection: 'column',
              padding: '48rpx',
            }}
          >
            <view bindtap={toggleB} style={{ ...btn, backgroundColor: '#c62828', marginBottom: 0 }}>
              <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>Close B</text>
            </view>
          </scroll-view>
        </SafeArea>
      </nav-screen>

      <nav-screen
        screen-id="test-a"
        stack-order={stackOrderFor('a', visible)}
        visible={showA}
        nav-transition="slide-right"
      >
        <SafeArea
          style={{
            backgroundColor: '#2e1e1e',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          edges={['top', 'bottom', 'left', 'right']}
        >
          <InsetsDebug />
          <text style={{ fontSize: '40rpx', fontWeight: 'bold', color: '#fff', marginBottom: '24rpx', marginLeft: '48rpx' }}>
            Screen A
          </text>
          <scroll-view
            scroll-y
            style={{
              flex: 1,
              minHeight: '0px',
              display: 'flex',
              flexDirection: 'column',
              padding: '48rpx',
            }}
          >
            <view bindtap={toggleA} style={{ ...btn, backgroundColor: '#c62828' }}>
              <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>Close A</text>
            </view>
            <PeerStackButtons current="a" openScreen={openScreen} btn={btn} />
          </scroll-view>
        </SafeArea>
      </nav-screen>
    </>
  )
}

export default function Stack() {
  return (
    <BackHandlerRoot>
      <NavScreenDirectTest />
    </BackHandlerRoot>
  )
}

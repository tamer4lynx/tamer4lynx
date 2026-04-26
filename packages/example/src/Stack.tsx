import '@lynx-js/react/debug'

import { BackHandlerRoot } from '@tamer4lynx/tamer-router'
import { SafeArea, Screen } from '@tamer4lynx/tamer-screen'

export default function Stack() {
  return (
    <BackHandlerRoot>
      <Screen style={{ backgroundColor: '#121212' }}>
        <SafeArea
          style={{
            padding: '48rpx',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          edges={['top', 'bottom', 'left', 'right']}
        >
          <text style={{ color: '#fff', fontSize: '34rpx', marginBottom: '24rpx' }}>
            The previous `nav-screen` overlay demos were removed from this screen.
          </text>
          <text style={{ color: '#bbb', fontSize: '28rpx' }}>
            Use ExampleStack (native `TamerNav` spokes) or `FileRouter` for stack navigation (requires `TamerNavModule` on the host).
          </text>
        </SafeArea>
      </Screen>
    </BackHandlerRoot>
  )
}

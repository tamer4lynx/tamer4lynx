/// <reference types="@lynx-js/react" />
import { useInsets, useKeyboard } from 'tamer-insets'
import type { InsetsWithRaw, KeyboardStateWithRaw } from 'tamer-insets'
import type { ViewProps } from '@lynx-js/types'

export type { InsetsWithRaw, KeyboardStateWithRaw }
export { useInsets, useKeyboard }

export interface ScreenProps extends ViewProps {}

export interface SafeAreaProps extends ViewProps {
  edges?: Array<'top' | 'right' | 'bottom' | 'left'>
}

export interface AvoidKeyboardProps extends ViewProps {
  behavior?: 'padding' | 'position'
}

export interface AppBarProps extends ViewProps {
  barHeight?: number
}

const ALL_EDGES = ['top', 'right', 'bottom', 'left'] as const
const DEFAULT_APP_BAR_HEIGHT = 56

export function Screen(props: ScreenProps) {
  const { children, style, ...rest } = props
  return (
    <view
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: '100vh',
        ...(style as object ?? {}),
      }}
      {...rest}
    >
      {children}
    </view>
  )
}

export function SafeArea(props: SafeAreaProps) {
  const { children, style, edges, ...rest } = props
  const insets = useInsets()
  const active = edges ?? ALL_EDGES

  const padding: ViewProps['style'] = {}
  if (active.includes('top')) padding.paddingTop = `${insets.top}px`
  if (active.includes('right')) padding.paddingRight = `${insets.right}px`
  if (active.includes('bottom')) padding.paddingBottom = `${insets.bottom}px`
  if (active.includes('left')) padding.paddingLeft = `${insets.left}px`

  return (
    <view
      style={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        ...padding,
        ...(style as object ?? {}),
      }}
      {...rest}
    >
      {children}
    </view>
  )
}

export function AppBar(props: AppBarProps) {
  const { children, style, barHeight = DEFAULT_APP_BAR_HEIGHT, ...rest } = props
  const insets = useInsets()
  return (
    <view
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top,
        minHeight: barHeight,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        ...(style as object ?? {}),
      }}
      {...rest}
    >
      {children}
    </view>
  )
}

export function AvoidKeyboard(props: AvoidKeyboardProps) {
  const { children, style, behavior = 'padding', ...rest } = props
  const keyboard = useKeyboard()

  if (behavior === 'position') {
    return (
      <view
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          bottom: keyboard.visible ? keyboard.height : 0,
          ...(style as object ?? {}),
        }}
        {...rest}
      >
        {children}
      </view>
    )
  }

  return (
    <view
      style={{
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: keyboard.visible ? keyboard.height : 0,
        ...(style as object ?? {}),
      }}
      {...rest}
    >
      {children}
    </view>
  )
}

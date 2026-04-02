/// <reference types="@lynx-js/types" />
import type { ViewProps } from '@lynx-js/types'

export type StackScreenProps = {
  /** Unique identifier for this screen in the stack. */
  'screen-id': string
  /** When true the screen slides in; when false it slides out and is removed. */
  visible?: boolean
} & ViewProps

declare module '@lynx-js/types' {
  interface IntrinsicElements {
    'stack-screen': StackScreenProps
  }
}
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'stack-screen': StackScreenProps
    }
  }
}

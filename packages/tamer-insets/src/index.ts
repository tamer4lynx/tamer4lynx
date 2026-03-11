import { useState, useEffect } from 'react'

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface InsetsWithRaw extends Insets {
  raw: Insets
}

export interface KeyboardState {
  visible: boolean
  height: number
}

export interface KeyboardStateWithRaw extends KeyboardState {
  raw: KeyboardState
}

declare const lynx: {
  getJSModule?(id: string): {
    addListener?(e: string, fn: (ev: any) => void): void;
    removeListener?(e: string, fn: unknown): void;
  };
} | undefined

declare const NativeModules: {
  TamerInsetsModule?: {
    getInsets(callback: (res: Insets) => void): void;
    getKeyboard(callback: (res: KeyboardState) => void): void;
  };
} | undefined

const DEFAULT_RAW_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }
const DEFAULT_INSETS: InsetsWithRaw = { ...DEFAULT_RAW_INSETS, raw: DEFAULT_RAW_INSETS }
const DEFAULT_RAW_KEYBOARD: KeyboardState = { visible: false, height: 0 }
const DEFAULT_KEYBOARD: KeyboardStateWithRaw = { ...DEFAULT_RAW_KEYBOARD, raw: DEFAULT_RAW_KEYBOARD }

type EventPayload<T> = T | { payload?: string }

function toInsets(raw: Insets): InsetsWithRaw {
  return {
    top: parseFloat(String(raw.top)),
    right: parseFloat(String(raw.right)),
    bottom: parseFloat(String(raw.bottom)),
    left: parseFloat(String(raw.left)),
    raw,
  }
}

function toKeyboard(raw: KeyboardState): KeyboardStateWithRaw {
  return { visible: raw.visible, height: parseFloat(String(raw.height)), raw }
}

function parsePayload<T>(event: EventPayload<T>): T | null {
  if (event && typeof event === 'object' && 'payload' in event && typeof event.payload === 'string') {
    try {
      return JSON.parse(event.payload) as T
    } catch {
      return null
    }
  }

  return event as T
}

export function useInsets() {
  const [insets, setInsets] = useState<InsetsWithRaw>(DEFAULT_INSETS)

  useEffect(() => {
    const bridge = typeof lynx !== 'undefined' ? lynx?.getJSModule?.('GlobalEventEmitter') : undefined

    const handleInsetsChange = (event: EventPayload<Insets>) => {
      const nextInsets = parsePayload(event)
      if (nextInsets && typeof nextInsets.top === 'number') setInsets(toInsets(nextInsets))
    }

    bridge?.addListener?.('tamer-insets:change', handleInsetsChange)

    try {
      NativeModules?.TamerInsetsModule?.getInsets?.((res: Insets) => {
        if (res && typeof res.top === 'number') setInsets(toInsets(res))
      })
    } catch (_) {}

    return () => {
      bridge?.removeListener?.('tamer-insets:change', handleInsetsChange)
    }
  }, [])

  return insets
}

export function useKeyboard() {
  const [keyboard, setKeyboard] = useState<KeyboardStateWithRaw>(DEFAULT_KEYBOARD)

  useEffect(() => {
    const bridge = typeof lynx !== 'undefined' ? lynx?.getJSModule?.('GlobalEventEmitter') : undefined

    const handleKeyboardChange = (event: EventPayload<KeyboardState>) => {
      const nextKeyboard = parsePayload(event)
      if (nextKeyboard && typeof nextKeyboard.visible === 'boolean') setKeyboard(toKeyboard(nextKeyboard))
    }

    bridge?.addListener?.('tamer-insets:keyboard', handleKeyboardChange)

    try {
      NativeModules?.TamerInsetsModule?.getKeyboard?.((res: KeyboardState) => {
        if (res && typeof res.visible === 'boolean') setKeyboard(toKeyboard(res))
      })
    } catch (_) {}

    return () => {
      bridge?.removeListener?.('tamer-insets:keyboard', handleKeyboardChange)
    }
  }, [])

  return keyboard
}

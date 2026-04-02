import { useEffect, useMemo } from '@lynx-js/react'
import { Stack } from '@tamer4lynx/tamer-router'
import { useSystemUI } from '@tamer4lynx/tamer-system-ui'

import { useExamplePalette } from '../../examplePalette.js'

export default function DevLayout() {
  const { setStatusBar, setNavigationBar } = useSystemUI()
  const p = useExamplePalette()

  useEffect(() => {
    const dark = p.theme?.isDark !== false
    setStatusBar({ color: p.barBackground, style: dark ? 'light' : 'dark' })
    setNavigationBar({ color: p.barBackground, style: dark ? 'light' : 'dark' })
  }, [p.barBackground, p.theme?.isDark, setStatusBar, setNavigationBar])

  const screenOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: p.barBackground },
      headerForegroundColor: p.barForeground,
    }),
    [p.barBackground, p.barForeground],
  )

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" path="/native" options={{ title: 'Native Tests' }} />
      <Stack.Screen name="auth" path="/native/auth" options={{ title: 'OAuth' }} />
      <Stack.Screen name="linking" path="/native/linking" options={{ title: 'tamer-linking' }} />
      <Stack.Screen name="browser" path="/native/browser" options={{ title: 'tamer-display-browser' }} />
      <Stack.Screen name="storage" path="/native/storage" options={{ title: 'tamer-local-storage' }} />
      <Stack.Screen name="webview" path="/native/webview" options={{ title: 'tamer-webview' }} />
      <Stack.Screen name="transports" path="/native/transports" options={{ title: 'tamer-transports' }} />
    </Stack>
  )
}

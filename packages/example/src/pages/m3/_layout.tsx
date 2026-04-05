import { useEffect, useMemo } from '@lynx-js/react'
import { Stack } from '@tamer4lynx/tamer-router'
import { useSystemUI } from '@tamer4lynx/tamer-system-ui'

import { useExamplePalette } from '../../examplePalette.js'

export default function M3Layout() {
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
      contentStyle: { backgroundColor: p.surface },
    }),
    [p.barBackground, p.barForeground, p.surface],
  )

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" path="/m3" options={{ title: 'M3 Components' }} />
      <Stack.Screen name="nav" path="/m3/nav" options={{ title: 'Navigation' }} />
    </Stack>
  )
}

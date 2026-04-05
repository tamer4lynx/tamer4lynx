import { useEffect, useMemo } from '@lynx-js/react'
import { Tabs } from '@tamer4lynx/tamer-router'
import { useSystemUI } from '@tamer4lynx/tamer-system-ui'

import { useExamplePalette } from '../examplePalette.js'

export default function Layout() {
  const { setStatusBar, setNavigationBar } = useSystemUI()
  const p = useExamplePalette()

  useEffect(() => {
    const dark = p.theme?.isDark !== false
    const bar = p.barBackground
    setStatusBar({ color: bar, style: dark ? 'light' : 'dark' })
    setNavigationBar({ color: bar, style: dark ? 'light' : 'dark' })
  }, [p.barBackground, p.theme?.isDark, setStatusBar, setNavigationBar])

  const screenOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: p.barBackground },
      headerForegroundColor: p.barForeground,
      tabBarStyle: {
        backgroundColor: p.barBackground,
        borderTopColor: 'rgba(255,255,255,0.08)',
      },
      contentStyle: { backgroundColor: p.surface },
      tabBarChromeHex: p.barBackground,
      themeColors: p.theme ?? null,
      iconColor: {
        pill: p.tabPill,
        active: p.tabIconActive,
        inactive: p.tabIconInactive,
        labelActive: p.tabLabelActive,
      },
    }),
    [
      p.barBackground,
      p.barForeground,
      p.surface,
      p.theme,
      p.tabPill,
      p.tabIconActive,
      p.tabIconInactive,
      p.tabLabelActive,
    ],
  )

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="index" path="/" options={{ title: 'Tamer4Lynx', icon: 'home', label: 'Home' }} />
      <Tabs.Screen name="insets" path="/insets" options={{ title: 'Insets', icon: 'fit_screen', label: 'Insets' }} />
      <Tabs.Screen name="screen" path="/screen" options={{ title: 'Screen', icon: 'list', label: 'Screen' }} />
      <Tabs.Screen name="secure" path="/secure" options={{ title: 'Secure Number', icon: 'lock', label: 'Secure' }} />
    </Tabs>
  )
}

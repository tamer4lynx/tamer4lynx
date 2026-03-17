import { useEffect } from '@lynx-js/react'
import { Tabs } from '@tamer4lynx/tamer-router'
import { useSystemUI } from '@tamer4lynx/tamer-system-ui'

export default function Layout() {
  const { setStatusBar, setNavigationBar } = useSystemUI()

  useEffect(() => {
    setStatusBar({ color: '#fff', style: 'light' })
    setNavigationBar({ color: '#fff', style: 'light' })
  }, [])

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#555' },
        tabBarStyle: { backgroundColor: '#555' },
      }}
    >
      <Tabs.Screen name="index" path="/" options={{ title: 'Tamer4Lynx', icon: 'home', label: 'Home' }} />
      <Tabs.Screen name="about" path="/about" options={{ title: 'About', icon: 'info', label: 'About' }} />
      <Tabs.Screen name="insets" path="/insets" options={{ title: 'Insets', icon: 'fit_screen', label: 'Insets' }} />
      <Tabs.Screen name="screen" path="/screen" options={{ title: 'Screen', icon: 'list', label: 'Screen' }} />
      <Tabs.Screen name="secure" path="/secure" options={{ title: 'Secure Number', icon: 'lock', label: 'Secure' }} />
    </Tabs>
  )
}

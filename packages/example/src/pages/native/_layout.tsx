import { Stack } from '@tamer4lynx/tamer-router'

export default function DevLayout() {
  return (
    <Stack  screenOptions={{ headerStyle: { backgroundColor: '#555' }  }}>
      <Stack.Screen name="index" path="/native" options={{ title: 'Native Tests' }} />
      <Stack.Screen name="auth" path="/native/auth" options={{ title: 'OAuth' }} />
      <Stack.Screen name="linking" path="/native/linking" options={{ title: 'tamer-linking' }} />
      <Stack.Screen name="browser" path="/native/browser" options={{ title: 'tamer-display-browser' }} />
    </Stack>
  )
}

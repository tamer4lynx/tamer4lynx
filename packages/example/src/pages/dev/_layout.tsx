import { Stack } from 'tamer-router'

export default function DevLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#555' } }}>
      <Stack.Screen name="index" path="/dev" options={{ title: 'Dev Tools' }} />
      <Stack.Screen name="auth" path="/dev/auth" options={{ title: 'OAuth' }} />
      <Stack.Screen name="linking" path="/dev/linking" options={{ title: 'tamer-linking' }} />
      <Stack.Screen name="browser" path="/dev/browser" options={{ title: 'tamer-display-browser' }} />
    </Stack>
  )
}

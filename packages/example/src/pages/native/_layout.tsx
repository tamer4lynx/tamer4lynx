import { Stack } from '@tamer4lynx/tamer-router';

export default function DevLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#555' } }}>
      <Stack.Screen
        name="index"
        path="/native"
        options={{ title: 'Native Tests' }}
      />
      <Stack.Screen
        name="auth"
        path="/native/auth"
        options={{ title: 'OAuth' }}
      />
      <Stack.Screen
        name="linking"
        path="/native/linking"
        options={{ title: 'tamer-linking' }}
      />
      <Stack.Screen
        name="browser"
        path="/native/browser"
        options={{ title: 'tamer-display-browser' }}
      />
      <Stack.Screen
        name="storage"
        path="/native/storage"
        options={{ title: 'tamer-local-storage' }}
      />
      <Stack.Screen
        name="webview"
        path="/native/webview"
        options={{ title: 'tamer-webview' }}
      />
      <Stack.Screen
        name="transports"
        path="/native/transports"
        options={{ title: 'tamer-transports' }}
      />
    </Stack>
  );
}

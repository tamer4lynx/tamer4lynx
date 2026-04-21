import { useEffect } from '@lynx-js/react';
import { Stack } from '@tamer4lynx/tamer-router';
import { useSystemUI } from '@tamer4lynx/tamer-system-ui';

import { useExamplePalette } from '../../examplePalette.js';

export default function DevLayout() {
  const { setStatusBar, setNavigationBar } = useSystemUI();
  const p = useExamplePalette();

  useEffect(() => {
    const dark = p.theme?.isDark !== false;
    setStatusBar({ color: p.barBackground, style: dark ? 'light' : 'dark' });
    setNavigationBar({
      color: p.barBackground,
      style: dark ? 'light' : 'dark',
    });
  }, [p.barBackground, p.theme?.isDark, setStatusBar, setNavigationBar]);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Native Tests' }}
      />
      <Stack.Screen
        name="auth"
        options={{ title: 'OAuth' }}
      />
      <Stack.Screen
        name="linking"
        options={{ title: 'tamer-linking' }}
      />
      <Stack.Screen
        name="browser"
        options={{ title: 'tamer-display-browser' }}
      />
      <Stack.Screen
        name="storage"
        options={{ title: 'tamer-local-storage' }}
      />
      <Stack.Screen
        name="webview"
        options={{ title: 'tamer-webview' }}
      />
      <Stack.Screen
        name="transports"
        options={{ title: 'tamer-transports' }}
      />
    </Stack>
  );
}

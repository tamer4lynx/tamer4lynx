import { Stack } from '@tamer4lynx/tamer-router';
import { useSystemUI } from '@tamer4lynx/tamer-system-ui';

import { useExamplePalette } from '../../examplePalette.js';
import { useSyncNavigationChrome } from '../../useSyncNavigationChrome.js';

export default function M3Layout() {
  const { setStatusBar, setNavigationBar } = useSystemUI();
  const p = useExamplePalette();
  const dark = p.theme?.isDark !== false;
  useSyncNavigationChrome(
    setStatusBar,
    setNavigationBar,
    p.barBackground,
    dark,
  );

  return (
    <Stack pathPrefix="/m3">
      <Stack.Screen
        name="index"
        options={{ title: 'M3 Components' }}
      />
      <Stack.Screen
        name="nav"
        options={{ title: 'Navigation' }}
      />
    </Stack>
  );
}

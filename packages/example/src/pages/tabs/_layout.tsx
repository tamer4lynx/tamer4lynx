import { Tab } from '@tamer4lynx/tamer-router';
import { useSystemUI } from '@tamer4lynx/tamer-system-ui';

import { useExamplePalette } from '../../examplePalette.js';
import { useSyncNavigationChrome } from '../../useSyncNavigationChrome.js';

export default function Layout() {
  const { setStatusBar, setNavigationBar } = useSystemUI();
  const p = useExamplePalette();
  const dark = p.theme?.isDark !== false;
  useSyncNavigationChrome(setStatusBar, setNavigationBar, p.barBackground, dark);

  return (
    <Tab>
      <Tab.Screen
        name="index"
        options={{ title: 'Tamer4Lynx', icon: 'home' }}
      />
      <Tab.Screen
        name="about"
        options={{ title: 'About', icon: 'info' }}
      />
      <Tab.Screen
        name="insets"
        options={{ title: 'Insets', icon: 'settings' }}
      />
      <Tab.Screen
        name="screen"
        options={{ title: 'Screen', icon: 'list' }}
      />
      <Tab.Screen
        name="secure"
        options={{ title: 'Secure Number', icon: 'lock' }}
      />
    </Tab>
  );
}

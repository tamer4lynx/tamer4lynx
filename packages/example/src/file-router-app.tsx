import { FileRouter } from '@tamer4lynx/tamer-router';
import RootNavigator, { tamerLinking } from '@tamer4lynx/tamer-router/generated-routes';

import { useExamplePalette } from './examplePalette.js';

export function FileRouterApp() {
  const p = useExamplePalette();
  return (
    <FileRouter
      routes={RootNavigator}
      linking={tamerLinking}
      rootBackgroundColor={p.background}
      overlayBackgroundColor={p.surface}
    />
  );
}

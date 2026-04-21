import '../../App.css';

import { pageShellStyle, useExamplePalette } from '../../examplePalette.js';
import { px } from '@tamer4lynx/tamer-app-shell';

/** Keep in sync with packages/example/package.json → version */
const EXAMPLE_APP_VERSION = '1.0.3';

export default function About() {
  const p = useExamplePalette();
  return (
    <scroll-view style={{
      display: "flex",
      flexDirection: "column",
      padding: px(32),
      gap: px(24),
    }}>
      <text
        className="Description"
        style={{ marginBottom: 12, color: p.onSurface }}
      >
        This bundle is the packages/example app (v{EXAMPLE_APP_VERSION}): a
        walkthrough of Tamer4Lynx on Lynx. The default entry in src/index.tsx
        renders FileRouterApp with file-based routes under src/pages.
      </text>
      <text
        className="Description"
        style={{ marginBottom: 8, color: p.onSurface }}
      >
        Included in this example:
      </text>
      <text
        className="Hint"
        style={{ marginBottom: 4, color: p.onSurfaceVariant }}
      >
        • File router, tabs, and stacks — tamer-router, tamer-screen,
        tamer-app-shell (tab bar and M3 Button / Card on Home)
      </text>
      <text
        className="Hint"
        style={{ marginBottom: 4, color: p.onSurfaceVariant }}
      >
        • Tab routes: Home, About, insets & keyboard, tamer-screen, secure
        storage with tamer-secure-store and tamer-biometric
      </text>
      <text
        className="Hint"
        style={{ marginBottom: 4, color: p.onSurfaceVariant }}
      >
        • Route /m3 — Material 3 samples from the app shell
      </text>
      <text
        className="Hint"
        style={{ marginBottom: 4, color: p.onSurfaceVariant }}
      >
        • Routes under /native — tamer-linking, tamer-display-browser, OAuth
        via tamer-auth, tamer-local-storage, tamer-webview, tamer-transports
      </text>
      <text
        className="Hint"
        style={{ marginBottom: 4, color: p.onSurfaceVariant }}
      >
        • Build: tamer-plugin and tamer-env (see lynx.config.ts); alternate
        entry stacks may import tamer-navigation
      </text>
      <text
        className="Hint"
        style={{ marginBottom: 16, color: p.onSurfaceVariant }}
      >
        • When hosted in the Tamer dev app, tamer-dev-client provides the dev
        launcher UI
      </text>
      <text
        className="Description"
        style={{ marginBottom: 8, color: p.onSurface }}
      >
        Stack: Tamer4Lynx, ReactLynx, Rspeedy, and Lynx.
      </text>
    </scroll-view>
  );
}

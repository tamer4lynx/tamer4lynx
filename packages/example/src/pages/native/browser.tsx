import { useCallback, useState } from '@lynx-js/react';
import { Button, px } from '@tamer4lynx/tamer-app-shell';
import type { AuthSessionResult } from '@tamer4lynx/tamer-display-browser';
import {
  openAuthSessionAsync,
  openBrowserAsync,
} from '@tamer4lynx/tamer-display-browser';

import { pageShellStyle, useExamplePalette } from '../../examplePalette.js';

export default function BrowserPage() {
  const p = useExamplePalette();
  const [status, setStatus] = useState<string>('');

  const onOpenBrowser = useCallback(() => {
    'background only';
    openBrowserAsync('https://example.com').then((r: { type: string }) =>
      setStatus(r.type === 'opened' ? 'Opened' : r.type),
    );
  }, []);

  const onOpenAuthSession = useCallback(() => {
    'background only';
    setStatus('Opening...');
    openAuthSessionAsync(
      'https://example.com',
      'tamerdevapp://auth/callback',
    ).then((r: AuthSessionResult) => {
      if (r.type === 'success') setStatus(`Success: ${r.url?.slice(0, 40)}...`);
      else setStatus(r.type);
    });
  }, []);

  return (
    <view
      style={{
        ...pageShellStyle(p.surface),
        padding: px(32),
        gap: px(24),
      }}
    >
      <Button
        label="openBrowserAsync"
        onTap={onOpenBrowser}
        variant="filled"
        size="sm"
        style={{ width: '100%', alignSelf: 'stretch' }}
      />
      <Button
        label="openAuthSessionAsync"
        onTap={onOpenAuthSession}
        variant="filled"
        size="sm"
        style={{ width: '100%', alignSelf: 'stretch' }}
      />
      {status ? (
        <text style={{ fontSize: px(18), color: p.onSurfaceVariant }}>
          {status}
        </text>
      ) : null}
    </view>
  );
}

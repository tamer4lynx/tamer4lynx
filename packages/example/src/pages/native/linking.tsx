import { useCallback, useEffect, useState } from '@lynx-js/react';
import { Button, px } from '@tamer4lynx/tamer-app-shell';
import {
  addEventListener,
  createURL,
  getInitialURL,
} from '@tamer4lynx/tamer-linking';

import { pageShellStyle, useExamplePalette } from '../../examplePalette.js';

export default function LinkingPage() {
  const p = useExamplePalette();
  const [createUrlResult, setCreateUrlResult] = useState<string>('');
  const [initialUrlResult, setInitialUrlResult] = useState<string>('');
  const [lastUrl, setLastUrl] = useState<string>('');

  const onCreateUrl = useCallback(() => {
    const url = createURL('test', { scheme: 'tamerdevapp' });
    setCreateUrlResult(url);
  }, []);

  const onGetInitialUrl = useCallback(() => {
    getInitialURL().then((url: string | null) =>
      setInitialUrlResult(url ?? '(null)'),
    );
  }, []);

  useEffect(() => {
    const sub = addEventListener('url', (e: { url?: string }) =>
      setLastUrl(e.url ?? ''),
    );
    return () => sub.remove();
  }, []);

  return (
    <view
      style={{
        display: "flex",
        flexDirection: "column",
        padding: px(32),
        gap: px(24),
      }}
    >
      <Button
        label="createURL"
        onTap={onCreateUrl}
        variant="filled"
        size="sm"
        shape="square"
        colors={{ container: '#555', label: '#fff' }}
        style={{ width: '100%', alignSelf: 'stretch' }}
      />
      {createUrlResult ? (
        <text
          style={{ fontSize: px(18), color: '#aaa', wordBreak: 'break-all' }}
        >
          {createUrlResult}
        </text>
      ) : null}
      <Button
        label="getInitialURL"
        onTap={onGetInitialUrl}
        variant="filled"
        size="sm"
        shape="square"
        colors={{ container: '#555', label: '#fff' }}
        style={{ width: '100%', alignSelf: 'stretch' }}
      />
      {initialUrlResult ? (
        <text
          style={{ fontSize: px(18), color: '#aaa', wordBreak: 'break-all' }}
        >
          {initialUrlResult}
        </text>
      ) : null}
      <text style={{ fontSize: px(18), color: '#aaa' }}>
        addEventListener (url): {lastUrl || 'waiting...'}
      </text>
    </view>
  );
}

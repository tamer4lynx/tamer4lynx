import { useCallback, useEffect, useState } from '@lynx-js/react';
import { px } from '@tamer4lynx/tamer-app-shell';
import { subscribeTamerNavTransitionEnd } from '@tamer4lynx/tamer-navigation';

import { pageShellStyle, useExamplePalette } from '../../examplePalette.js';

export default function WebViewPage() {
  const p = useExamplePalette();
  const [status, setStatus] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    'background only';
    if (!loaded) {
      const checkLoaded = () => {
        setStatus('Loading WebView...');
      };
      setTimeout(checkLoaded, 500);
    }
    return () => {
      'background only';
      // Cleanup handler if needed
    };
  }, [loaded]);

  const onLoad = useCallback(
    (e: { detail: { url: string; title: string } }) => {
      'background only';
      setStatus(`Loaded: ${e.detail.title || e.detail.url}`);
    },
    [],
  );

  useEffect(() => {
    'background only';
    if (!loaded) return;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setStatus(`Loaded: https://tamer4lynx.github.io`);
    };

    const off = subscribeTamerNavTransitionEnd(finish);
    const safety = setTimeout(finish, 500);
    return () => {
      off();
      clearTimeout(safety);
    };
  }, [loaded]);

  return (
    <view>
      {status ? (
        <text style={{ width: '100%', fontSize: px(14), color: '#8f8' }}>
          {status}
        </text>
      ) : null}
      <webview
        uri="https://tamer4lynx.github.io"
        javaScriptEnabled={true}
        style={{ width: '100vw', height: '82.5vh', backgroundColor: '#222' }}
        bindload={onLoad}
        onLoadStart={() => {
          'background only';
          setLoaded(true);
        }}
      />
    </view>
  );
}

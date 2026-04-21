import { useCallback, useState } from '@lynx-js/react';
import { px } from '@tamer4lynx/tamer-app-shell';

import { pageShellStyle, useExamplePalette } from '../../examplePalette.js';

export default function WebViewPage() {
  const p = useExamplePalette();
  const [status, setStatus] = useState('');

  const onLoad = useCallback(
    (e: { detail: { url: string; title: string } }) => {
      'background only';
      setStatus(`Loaded: ${e.detail.title || e.detail.url}`);
    },
    [],
  );

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
      />
    </view>
  );
}

import { useCallback } from '@lynx-js/react';
import { px } from '@tamer4lynx/tamer-app-shell';
import {
  sendTamerState,
  useTamerNavigate,
  useTamerStateSnapshot,
} from '@tamer4lynx/tamer-router';

import { pageShellStyle, useExamplePalette } from '../../../examplePalette.js';

type DemoSnap = { count?: number } | undefined;

export default function NativeDetailEdit() {
  const p = useExamplePalette();
  const { back } = useTamerNavigate();
  const demo = useTamerStateSnapshot('demo') as DemoSnap;
  const count = typeof demo?.count === 'number' ? demo.count : 0;

  const goBack = useCallback(() => {
    'background only';
    back();
  }, [back]);

  const inc = useCallback(() => {
    'background only';
    sendTamerState('demo', { type: 'demo/inc' });
  }, []);

  const onTapGoBack = useCallback(() => {
    'background only';
    goBack();
  }, [goBack]);

  const onTapInc = useCallback(() => {
    'background only';
    inc();
  }, [inc]);

  return (
    <scroll-view scroll-y style={pageShellStyle(p.background)}>
      <view style={{ padding: px(20), gap: px(12), display: 'flex', flexDirection: 'column' }}>
        <text style={{ color: p.onSurface, fontSize: px(18), fontWeight: '600' }}>Edit</text>
        <text style={{ color: p.onSurfaceVariant, fontSize: px(14) }}>Demo count: {count}</text>
        <view
          flatten={false}
          native-interaction-enabled={true}
          user-interaction-enabled={true}
          bindtap={onTapGoBack}
          style={{
            marginTop: px(8),
            padding: px(14),
            borderRadius: px(12),
            backgroundColor: p.surface,
            alignItems: 'center',
          }}
        >
          <text user-interaction-enabled={false} style={{ color: p.onSurface, fontSize: px(15), fontWeight: '600' }}>
            Back (inner)
          </text>
        </view>
        <view
          flatten={false}
          native-interaction-enabled={true}
          user-interaction-enabled={true}
          bindtap={onTapInc}
          style={{
            marginTop: px(8),
            padding: px(14),
            borderRadius: px(12),
            backgroundColor: '#555',
            alignItems: 'center',
          }}
        >
          <text user-interaction-enabled={false} style={{ color: '#fff', fontSize: px(15), fontWeight: '600' }}>
            Inc
          </text>
        </view>
      </view>
    </scroll-view>
  );
}

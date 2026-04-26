import { useCallback } from '@lynx-js/react';
import { px } from '@tamer4lynx/tamer-app-shell';
import {
  sendTamerState,
  useParams,
  useTamerNavigate,
  useTamerStateSnapshot,
} from '@tamer4lynx/tamer-router';

import { pageShellStyle, useExamplePalette } from '../../../examplePalette.js';

type DemoSnap = { count?: number } | undefined;

export default function NativeDetailId() {
  const p = useExamplePalette();
  const { id } = useParams();
  const { push } = useTamerNavigate();
  const demo = useTamerStateSnapshot('demo') as DemoSnap;
  const count = typeof demo?.count === 'number' ? demo.count : 0;

  const goEdit = useCallback(() => {
    'background only';
    push('/native/details/edit');
  }, [push]);

  const inc = useCallback(() => {
    'background only';
    sendTamerState('demo', { type: 'demo/inc' });
  }, []);

  const onTapGoEdit = useCallback(() => {
    'background only';
    goEdit();
  }, [goEdit]);

  const onTapInc = useCallback(() => {
    'background only';
    inc();
  }, [inc]);

  return (
    <scroll-view scroll-y style={pageShellStyle(p.background)}>
      <view style={{ padding: px(20), gap: px(12), display: 'flex', flexDirection: 'column' }}>
        <text style={{ color: p.onSurface, fontSize: px(18), fontWeight: '600' }}>
          Item {id ?? '?'}
        </text>
        <text style={{ color: p.onSurfaceVariant, fontSize: px(14) }}>
          Shared demo store count (hydrated on spoke): {count}
        </text>
        <text style={{ color: p.onSurfaceVariant, fontSize: px(13), lineHeight: px(18) }}>
          Open edit as a same-layout sibling — native push count should stay flat; use system back
          and inner stack should pop before the native stack.
        </text>
        <view
          flatten={false}
          native-interaction-enabled={true}
          user-interaction-enabled={true}
          bindtap={onTapGoEdit}
          style={{
            marginTop: px(8),
            padding: px(14),
            borderRadius: px(12),
            backgroundColor: p.surface,
            alignItems: 'center',
          }}
        >
          <text user-interaction-enabled={false} style={{ color: p.onSurface, fontSize: px(15), fontWeight: '600' }}>
            Go to edit
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
            Inc (provider-mutate)
          </text>
        </view>
      </view>
    </scroll-view>
  );
}

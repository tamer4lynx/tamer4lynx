import { useCallback } from '@lynx-js/react';
import { px } from '@tamer4lynx/tamer-app-shell';
import {
  sendTamerState,
  useParams,
  useTamerNavigate,
  useTamerStateSnapshot,
} from '@tamer4lynx/tamer-router';

import {
  dispatchDetailsRecoilMutation,
  useDetailsRecoilState,
  type DetailsRecoilState,
} from '../../../details-recoil-state.js';
import { pageShellStyle, useExamplePalette } from '../../../examplePalette.js';

type DemoSnap = { count?: number } | undefined;
type DetailsRecoilSnap = Partial<DetailsRecoilState> | undefined;

export default function NativeDetailId() {
  const p = useExamplePalette();
  const { id } = useParams();
  const { push } = useTamerNavigate();
  const demo = useTamerStateSnapshot('demo') as DemoSnap;
  const detailsSnapshot = useTamerStateSnapshot(
    'detailsRecoil',
  ) as DetailsRecoilSnap;
  const [detailsRecoil, setDetailsRecoil] = useDetailsRecoilState();
  const count = typeof demo?.count === 'number' ? demo.count : 0;
  const snapshotCount =
    typeof detailsSnapshot?.count === 'number' ? detailsSnapshot.count : 0;

  const goEdit = useCallback(() => {
    'background only';
    push('/native/details/edit');
  }, [push]);

  const inc = useCallback(() => {
    'background only';
    sendTamerState('demo', { type: 'demo/inc' });
  }, []);

  const incLocalRecoil = useCallback(() => {
    'background only';
    setDetailsRecoil((prev) => ({
      ...prev,
      count: prev.count + 1,
      note: `detail ${id ?? '?'}`,
      updatedBy: 'detail-local-recoil',
    }));
  }, [id, setDetailsRecoil]);

  const incRouterSync = useCallback(() => {
    'background only';
    sendTamerState('detailsRecoil', {
      type: 'details/inc',
      source: 'detail-sendTamerState',
    });
  }, []);

  const incCoordinatorViaNav = useCallback(() => {
    'background only';
    dispatchDetailsRecoilMutation('detail-TamerNav.dispatch');
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
        <text style={{ color: p.onSurfaceVariant, fontSize: px(14) }}>
          Recoil provider count: {detailsRecoil.count} / synced snapshot: {snapshotCount}
        </text>
        <text style={{ color: p.onSurfaceVariant, fontSize: px(13), lineHeight: px(18) }}>
          Recoil note: {detailsRecoil.note} · updated by {detailsRecoil.updatedBy}
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
        <view
          flatten={false}
          native-interaction-enabled={true}
          user-interaction-enabled={true}
          bindtap={incLocalRecoil}
          style={{
            marginTop: px(8),
            padding: px(14),
            borderRadius: px(12),
            backgroundColor: p.surface,
            alignItems: 'center',
          }}
        >
          <text user-interaction-enabled={false} style={{ color: p.onSurface, fontSize: px(15), fontWeight: '600' }}>
            Inc local Recoil provider
          </text>
        </view>
        <view
          flatten={false}
          native-interaction-enabled={true}
          user-interaction-enabled={true}
          bindtap={incRouterSync}
          style={{
            marginTop: px(8),
            padding: px(14),
            borderRadius: px(12),
            backgroundColor: p.surface,
            alignItems: 'center',
          }}
        >
          <text user-interaction-enabled={false} style={{ color: p.onSurface, fontSize: px(15), fontWeight: '600' }}>
            Inc via tamer-router sync
          </text>
        </view>
        <view
          flatten={false}
          native-interaction-enabled={true}
          user-interaction-enabled={true}
          bindtap={incCoordinatorViaNav}
          style={{
            marginTop: px(8),
            padding: px(14),
            borderRadius: px(12),
            backgroundColor: '#555',
            alignItems: 'center',
          }}
        >
          <text user-interaction-enabled={false} style={{ color: '#fff', fontSize: px(15), fontWeight: '600' }}>
            Inc via TamerNav dispatch
          </text>
        </view>
      </view>
    </scroll-view>
  );
}

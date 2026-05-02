import { useCallback } from '@lynx-js/react';
import { Button, px } from '@tamer4lynx/tamer-app-shell';
import {
  sendTamerState,
  useParams,
  useTamerRouter,
  useTamerStateSnapshot,
} from '@tamer4lynx/tamer-router';

import {
  dispatchDetailsRecoilMutation,
  useDetailsRecoilState,
  type DetailsRecoilState,
} from '../../../details-recoil-state.js';
import { incrementDemoStore, useDemoState } from '../../../demo-store.js';
import { pageShellStyle, useExamplePalette } from '../../../examplePalette.js';

type DetailsRecoilSnap = Partial<DetailsRecoilState> | undefined;

export default function NativeDetailId() {
  const p = useExamplePalette();
  const { id } = useParams();
  const { push } = useTamerRouter();
  const demo = useDemoState();
  const detailsSnapshot = useTamerStateSnapshot(
    'detailsRecoil',
  ) as DetailsRecoilSnap;
  const [detailsRecoil, setDetailsRecoil] = useDetailsRecoilState();
  const count = demo.count;
  const snapshotCount =
    typeof detailsSnapshot?.count === 'number' ? detailsSnapshot.count : 0;

  const goEdit = useCallback(() => {
    'background only';
    push('/native/details/edit');
  }, [push]);

  const inc = useCallback(() => {
    'background only';
    incrementDemoStore();
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

  return (
    <scroll-view scroll-y style={pageShellStyle(p.background)}>
      <view style={{ padding: px(20), gap: px(12), display: 'flex', flexDirection: 'column' }}>
        <text style={{ color: p.onSurface, fontSize: px(18), fontWeight: '600' }}>
          Item {id ?? '?'}
        </text>
        <text style={{ color: p.onSurfaceVariant, fontSize: px(14) }}>
          Zustand singleton count: {count}
        </text>
        <text style={{ color: p.onSurfaceVariant, fontSize: px(14) }}>
          Recoil connector count: {detailsRecoil.count} / snapshot: {snapshotCount}
        </text>
        <text style={{ color: p.onSurfaceVariant, fontSize: px(13), lineHeight: px(18) }}>
          Recoil note: {detailsRecoil.note} · updated by {detailsRecoil.updatedBy}
        </text>
        <text style={{ color: p.onSurfaceVariant, fontSize: px(13), lineHeight: px(18) }}>
          Open edit as a same-layout sibling — native push count should stay flat; use system back
          and inner stack should pop before the native stack.
        </text>
        <Button
          label="Go to edit"
          variant="tonal"
          onTap={goEdit}
          style={{ width: '100%', alignSelf: 'stretch' }}
        />
        <Button
          label="Inc Zustand singleton"
          variant="filled"
          onTap={inc}
          style={{ width: '100%', alignSelf: 'stretch' }}
        />
        <Button
          label="Inc local Recoil bridge"
          variant="tonal"
          onTap={incLocalRecoil}
          style={{ width: '100%', alignSelf: 'stretch' }}
        />
        <Button
          label="Inc Recoil providerConnector"
          variant="tonal"
          onTap={incRouterSync}
          style={{ width: '100%', alignSelf: 'stretch' }}
        />
        <Button
          label="Inc Recoil via TamerNav dispatch"
          variant="filled"
          onTap={incCoordinatorViaNav}
          style={{ width: '100%', alignSelf: 'stretch' }}
        />
      </view>
    </scroll-view>
  );
}

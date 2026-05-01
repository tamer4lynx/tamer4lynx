import { useCallback } from "@lynx-js/react";
import { px } from "@tamer4lynx/tamer-app-shell";
import {
  sendTamerState,
  useTamerNavigate,
  useTamerStateSnapshot,
} from "@tamer4lynx/tamer-router";
import {
  dispatchDetailsRecoilMutation,
  useDetailsRecoilState,
  type DetailsRecoilState,
} from "../../../details-recoil-state.js";
import { incrementDemoStore, useDemoState } from "../../../demo-store.js";
import { pageShellStyle, useExamplePalette } from "../../../examplePalette.js";

type DetailsRecoilSnap = Partial<DetailsRecoilState> | undefined;

export default function NativeDetailEdit() {
  const p = useExamplePalette();
  const { back } = useTamerNavigate();
  const demo = useDemoState();
  const detailsSnapshot = useTamerStateSnapshot(
    "detailsRecoil",
  ) as DetailsRecoilSnap;
  const [detailsRecoil, setDetailsRecoil] = useDetailsRecoilState();
  const count = demo.count;
  const snapshotCount =
    typeof detailsSnapshot?.count === "number" ? detailsSnapshot.count : 0;

  const goBack = useCallback(() => {
    "background only";
    back();
  }, [back]);

  const inc = useCallback(() => {
    "background only";
    incrementDemoStore();
  }, []);

  const incLocalRecoil = useCallback(() => {
    "background only";
    setDetailsRecoil((prev) => ({
      ...prev,
      count: prev.count + 1,
      note: "edit",
      updatedBy: "edit-local-recoil",
    }));
  }, [setDetailsRecoil]);

  const incRouterSync = useCallback(() => {
    "background only";
    sendTamerState("detailsRecoil", {
      type: "details/inc",
      source: "edit-sendTamerState",
    });
  }, []);

  const incCoordinatorViaNav = useCallback(() => {
    "background only";
    dispatchDetailsRecoilMutation("edit-TamerNav.dispatch");
  }, []);

  const onTapGoBack = useCallback(() => {
    "background only";
    goBack();
  }, [goBack]);

  const onTapInc = useCallback(() => {
    "background only";
    inc();
  }, [inc]);

  return (
    <scroll-view scroll-y style={pageShellStyle(p.background)}>
      <view
        style={{
          padding: px(20),
          gap: px(12),
          display: "flex",
          flexDirection: "column",
        }}
      >
        <text
          style={{ color: p.onSurface, fontSize: px(18), fontWeight: "600" }}
        >
          Edit
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
            alignItems: "center",
          }}
        >
          <text
            user-interaction-enabled={false}
            style={{ color: p.onSurface, fontSize: px(15), fontWeight: "600" }}
          >
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
            backgroundColor: "#555",
            alignItems: "center",
          }}
        >
          <text
            user-interaction-enabled={false}
            style={{ color: "#fff", fontSize: px(15), fontWeight: "600" }}
          >
            Inc Zustand singleton
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
            alignItems: "center",
          }}
        >
          <text
            user-interaction-enabled={false}
            style={{ color: p.onSurface, fontSize: px(15), fontWeight: "600" }}
          >
            Inc local Recoil bridge
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
            alignItems: "center",
          }}
        >
          <text
            user-interaction-enabled={false}
            style={{ color: p.onSurface, fontSize: px(15), fontWeight: "600" }}
          >
            Inc Recoil providerConnector
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
            backgroundColor: "#555",
            alignItems: "center",
          }}
        >
          <text
            user-interaction-enabled={false}
            style={{ color: "#fff", fontSize: px(15), fontWeight: "600" }}
          >
            Inc Recoil via TamerNav dispatch
          </text>
        </view>
      </view>
    </scroll-view>
  );
}

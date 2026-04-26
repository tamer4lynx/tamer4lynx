import { useCallback } from "@lynx-js/react";
import { px } from "@tamer4lynx/tamer-app-shell";
import { useTamerNavigate } from "@tamer4lynx/tamer-router";

import { pageShellStyle, useExamplePalette } from "../../examplePalette.js";

function NativeMenuCard({
  title,
  subtitle,
  onTap,
}: {
  title: string;
  subtitle?: string;
  onTap: () => void;
}) {
  const handleTap = useCallback(() => {
    "background only";
    onTap();
  }, [onTap]);

  return (
    <view
      flatten={false}
      native-interaction-enabled={true}
      user-interaction-enabled={true}
      bindtap={handleTap}
      style={{
        width: "100%",
        minHeight: px(92),
        borderRadius: px(18),
        backgroundColor: "#555",
        paddingLeft: px(20),
        paddingRight: px(20),
        paddingTop: px(18),
        paddingBottom: px(18),
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: px(6),
      }}
    >
      <text
        user-interaction-enabled={false}
        style={{
          color: "#e8e8e8",
          fontSize: px(16),
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {title}
      </text>
      {subtitle ? (
        <text
          user-interaction-enabled={false}
          style={{
            color: "#c8c8c8",
            fontSize: px(13),
            lineHeight: px(18),
            textAlign: "center",
          }}
        >
          {subtitle}
        </text>
      ) : null}
    </view>
  );
}

export default function DevIndex() {
  const p = useExamplePalette();
  const { push } = useTamerNavigate();

  const goLinking = useCallback(() => {
    "background only";
    push("/native/linking");
  }, [push]);
  const goBrowser = useCallback(() => {
    "background only";
    push("/native/browser");
  }, [push]);
  const goAuth = useCallback(() => {
    "background only";
    push("/native/auth");
  }, [push]);
  const goStorage = useCallback(() => {
    "background only";
    push("/native/storage");
  }, [push]);
  const goWebView = useCallback(() => {
    "background only";
    push("/native/webview");
  }, [push]);
  const goTransports = useCallback(() => {
    "background only";
    push("/native/transports");
  }, [push]);
  const goInnerStackDemo = useCallback(() => {
    "background only";
    push("/native/details/42");
  }, [push]);

  return (
    <view
      style={{
        flex: 1,
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        padding: px(32),
        gap: px(24),
      }}
    >
      <NativeMenuCard
        title="tamer-linking"
        subtitle="createURL, getInitialURL, addEventListener"
        onTap={goLinking}
      />
      <NativeMenuCard
        title="tamer-display-browser"
        subtitle="openBrowserAsync, openAuthSessionAsync"
        onTap={goBrowser}
      />
      <NativeMenuCard
        title="OAuth"
        subtitle="Authorization code flow"
        onTap={goAuth}
      />
      <NativeMenuCard
        title="Storage"
        subtitle="Local storage"
        onTap={goStorage}
      />
      <NativeMenuCard
        title="tamer-webview (webview)"
        subtitle="Embedded WKWebView / WebView"
        onTap={goWebView}
      />
      <NativeMenuCard
        title="tamer-transports"
        subtitle="fetch, WebSocket, EventSource"
        onTap={goTransports}
      />
      <NativeMenuCard
        title="Router inner stack"
        subtitle="Same _layout chain: edit without extra native push; provider bridge"
        onTap={goInnerStackDemo}
      />
    </view>
  );
}

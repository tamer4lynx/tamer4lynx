import { useCallback, useMemo } from "@lynx-js/react";
import { Card, px } from "@tamer4lynx/tamer-app-shell";
import { useTamerNavigate } from "@tamer4lynx/tamer-router";

import { pageShellStyle, useExamplePalette } from "../../examplePalette.js";

const MENU_ROW_ESTIMATE_PX = 128;
const LIST_TAIL_SPACER_PX = 1;

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
  const goConnectors = useCallback(() => {
    "background only";
    push("/connectors");
  }, [push]);

  const entries = useMemo(
    () =>
      [
        {
          itemKey: "native-menu-linking",
          title: "tamer-linking",
          subtitle: "createURL, getInitialURL, addEventListener",
          onTap: goLinking,
        },
        {
          itemKey: "native-menu-browser",
          title: "tamer-display-browser",
          subtitle: "openBrowserAsync, openAuthSessionAsync",
          onTap: goBrowser,
        },
        {
          itemKey: "native-menu-oauth",
          title: "OAuth",
          subtitle: "Authorization code flow",
          onTap: goAuth,
        },
        {
          itemKey: "native-menu-storage",
          title: "Storage",
          subtitle: "Local storage",
          onTap: goStorage,
        },
        {
          itemKey: "native-menu-webview",
          title: "tamer-webview (webview)",
          subtitle: "Embedded WKWebView / WebView",
          onTap: goWebView,
        },
        {
          itemKey: "native-menu-transports",
          title: "tamer-transports",
          subtitle: "fetch, WebSocket, EventSource",
          onTap: goTransports,
        },
        {
          itemKey: "native-menu-inner-stack",
          title: "Router inner stack",
          subtitle:
            "Same _layout chain: edit without extra native push; provider bridge",
          onTap: goInnerStackDemo,
        },
        {
          itemKey: "native-menu-connectors",
          title: "State sync connectors",
          subtitle:
            "Zustand · Redux · TanStack · Apollo · SWR · Jotai · i18next · Theme",
          onTap: goConnectors,
        },
      ] as const,
    [
      goAuth,
      goBrowser,
      goConnectors,
      goInnerStackDemo,
      goLinking,
      goStorage,
      goTransports,
      goWebView,
    ],
  );

  const shell = pageShellStyle(p.surface);

  return (
    <view
      style={{
        ...shell,
        width: "100%",
        height: "100vh",
      }}
    >
      <scroll-view
        scroll-orientation="vertical"
        list-type="single"
        span-count={1}
        preload-buffer-count={1}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          minHeight: "100%",
          gap: px(24),
          paddingLeft: px(32),
          paddingRight: px(32),
          paddingTop: px(32),
          paddingBottom: px(MENU_ROW_ESTIMATE_PX/2),
          backgroundColor: shell.backgroundColor,
        }}
      >
        {entries.map((e) => (
          <Card bindtap={e.onTap} variant="elevated" style={{
            minHeight: px(MENU_ROW_ESTIMATE_PX),
            marginBottom: px(24)
          }}>
              <view
                style={{
                  width: "100%",
                  minHeight: px(92),
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: px(6),
                  padding: px(20),
                }}
              >
                <text
                  style={{
                    color: "#e8e8e8",
                    fontSize: px(16),
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  {e.title}
                </text>
                {e.subtitle ? (
                  <text
                    style={{
                      color: "#c8c8c8",
                      fontSize: px(13),
                      lineHeight: px(18),
                      textAlign: "center",
                    }}
                  >
                    {e.subtitle}
                  </text>
                ) : null}
              </view>
            </Card>
        ))}
      </scroll-view>



    </view>
  );
}

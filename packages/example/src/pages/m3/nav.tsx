import { useState } from "@lynx-js/react";
import {
  Button,
  Fab,
  NavigationDrawer,
  NavigationRail,
  px,
} from "@tamer4lynx/tamer-app-shell";
import { useScreenOptions } from "@tamer4lynx/tamer-router";
import { pageShellStyle, useExamplePalette } from "../../examplePalette.js";

const DRAWER_SECTIONS = [
  {
    items: [
      { icon: "inbox", label: "Inbox", value: "inbox", badge: "24" },
      { icon: "send", label: "Sent", value: "sent" },
      { icon: "drafts", label: "Drafts", value: "drafts", badge: "3" },
    ],
  },
  {
    title: "Labels",
    items: [
      { icon: "label", label: "Work", value: "work" },
      { icon: "label", label: "Personal", value: "personal" },
      { icon: "label", label: "Travel", value: "travel" },
    ],
  },
];

const RAIL_ITEMS = [
  { icon: "home", label: "Home", value: "home" },
  { icon: "search", label: "Search", value: "search", badge: "3" },
  { icon: "favorite", label: "Saved", value: "saved", dot: true },
  { icon: "person", label: "Profile", value: "profile" },
];

export default function NavDemo() {
  useScreenOptions({ title: "Navigation" });
  const p = useExamplePalette();
  const border =
    p.theme?.isDark !== false ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSelected, setDrawerSelected] = useState("inbox");
  const [railSelected, setRailSelected] = useState("home");

  const closeDrawerAfterSelection = (value: string) => {
    setDrawerSelected(value);
    setTimeout(() => {
      setDrawerOpen(false);
    }, 120);
  };

  return (
    <>
      <view style={pageShellStyle(p.background)}>
        <view
          style={{
            display: "flex",
            flexDirection: "column",
            padding: px(16),
            paddingBottom: px(24),
          }}
        >
          {/* ── Navigation Drawer ── */}
          <text
            style={{
              fontSize: px(12),
              fontWeight: "500",
              color: p.onSurfaceVariant,
              marginBottom: px(12),
            }}
          >
            NAVIGATION DRAWER
          </text>

          <view
            style={{
              backgroundColor: p.surfaceContainer,
              borderRadius: px(12),
              padding: px(16),
              marginBottom: px(12),
              borderWidth: "1px",
              borderColor: border,
            }}
          >
            <text
              style={{
                fontSize: px(14),
                color: p.onSurface,
                marginBottom: px(4),
              }}
            >
              Modal drawer with the Material 3 container, shape, and active-item
              treatment.
            </text>
            <text
              style={{
                fontSize: px(12),
                color: p.onSurfaceVariant,
                marginBottom: px(16),
              }}
            >
              Selected item: {drawerSelected}
            </text>
            <Button
              label="Open Drawer"
              variant="filled"
              icon="menu"
              onTap={() => setDrawerOpen(true)}
            />
          </view>

          {/* ── Navigation Rail ── */}
          <text
            style={{
              fontSize: px(12),
              fontWeight: "500",
              color: p.onSurfaceVariant,
              marginBottom: px(12),
              marginTop: px(4),
            }}
          >
            NAVIGATION RAIL
          </text>

          <view
            style={{
              backgroundColor: p.surfaceContainer,
              borderRadius: px(12),
              borderWidth: "1px",
              borderColor: border,
              overflow: "hidden",
              marginBottom: px(12),
            }}
          >
            <view
              style={{
                width: "100%",
                paddingLeft: px(16),
                paddingRight: px(16),
                paddingTop: px(14),
                paddingBottom: px(12),
              }}
            >
              <text
                style={{
                  fontSize: px(16),
                  fontWeight: "500",
                  color: p.onSurface,
                  width: "100%",
                }}
              >
                {railSelected}
              </text>
              <text
                style={{
                  fontSize: px(12),
                  color: p.onSurfaceVariant,
                  marginTop: px(4),
                  lineHeight: px(16),
                  width: "100%",
                }}
              >
                Tap rail items to switch sections.
              </text>
            </view>
            <view
              style={{
                display: "grid",
                width: "100%",
                height: px(380),
                gridTemplateColumns: `${px(96)} minmax(0, 1fr)`,
              }}
            >
              <NavigationRail
                items={RAIL_ITEMS}
                selected={railSelected}
                onSelect={setRailSelected}
                top={<Fab icon="edit" size="small" onTap={() => {}} />}
                style={{
                  backgroundColor: p.surfaceContainer,
                  minWidth: px(96),
                  maxWidth: px(96),
                }}
                colors={{
                  indicator:
                    p.secondaryContainer ?? "var(--m3-secondary-container)",
                  inactiveIcon: p.onSurfaceVariant,
                  inactiveLabel: p.onSurfaceVariant,
                }}
              />
              <view
                style={{
                  minWidth: "0px",
                  height: "100%",
                  backgroundColor: p.surfaceContainer,
                }}
              />
            </view>
          </view>

          <view
            style={{
              backgroundColor: p.surfaceContainer,
              borderRadius: px(12),
              borderWidth: "1px",
              borderColor: border,
              overflow: "hidden",
              marginBottom: px(12),
            }}
          >
            <view
              style={{
                width: "100%",
                paddingLeft: px(16),
                paddingRight: px(16),
                paddingTop: px(14),
                paddingBottom: px(12),
              }}
            >
              <text
                style={{
                  fontSize: px(16),
                  fontWeight: "500",
                  color: p.onSurface,
                  width: "100%",
                }}
              >
                Expanded rail
              </text>
              <text
                style={{
                  fontSize: px(12),
                  color: p.onSurfaceVariant,
                  marginTop: px(4),
                  lineHeight: px(16),
                  width: "100%",
                }}
              >
                Rail items can expand into left-aligned rows.
              </text>
            </view>
            <view
              style={{
                display: "grid",
                width: "100%",
                height: px(380),
                gridTemplateColumns: `${px(256)} minmax(0, 1fr)`,
              }}
            >
              <NavigationRail
                expanded
                items={RAIL_ITEMS}
                selected={railSelected}
                onSelect={setRailSelected}
                top={
                  <view
                    style={{
                      width: px(24),
                      height: px(24),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <icon
                      icon="menu"
                      set="material"
                      size={24}
                      iconColor={p.onSurfaceVariant}
                    />
                  </view>
                }
                style={{
                  backgroundColor: p.surfaceContainer,
                  minWidth: px(256),
                  maxWidth: px(256),
                }}
                colors={{
                  indicator:
                    p.secondaryContainer ?? "var(--m3-secondary-container)",
                  inactiveIcon: p.onSurfaceVariant,
                  inactiveLabel: p.onSurfaceVariant,
                }}
              />
              <view
                style={{
                  minWidth: "0px",
                  height: "100%",
                  backgroundColor: p.surfaceContainer,
                }}
              />
            </view>
          </view>

          <view style={{ height: px(24) }} />
        </view>
      </view>
      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sections={DRAWER_SECTIONS}
        selected={drawerSelected}
        headline="Mail"
        onSelect={closeDrawerAfterSelection}
        colors={{
          surface: p.surfaceContainer,
          onSurface: p.onSurface,
          onSurfaceVariant: p.onSurfaceVariant,
          selectedContainer:
            p.secondaryContainer ?? "var(--m3-secondary-container)",
        }}
      />
    </>
  );
}

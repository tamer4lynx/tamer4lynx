import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import {
  Button,
  ButtonGroup,
  Card,
  ExtendedFab,
  Fab,
  FabMenu,
  px,
} from "@tamer4lynx/tamer-app-shell";
import { useTamerRouter } from "@tamer4lynx/tamer-router";
import { pageShellStyle, useExamplePalette } from "../../examplePalette.js";

const ESTIMATE = {
  /** Dense button stacks + section label */
  BUTTON_STACK: 320,
  ICON_BUTTON_STACK: 280,
  CARD_TRIO_ROW: 228,
  BUTTON_GROUP_DUAL: 250,
  FAB_ROW: 170,
  EXTENDED_FAB_STACK: 200,
  BODY_COPY: 190,
  NAV_CTA: 230,
} as const;

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <text
      style={{
        fontSize: px(12),
        fontWeight: "500",
        lineHeight: px(16),
        color,
        letterSpacing: "0.5px",
        marginBottom: px(12),
        marginTop: px(4),
      }}
    >
      {title.toUpperCase()}
    </text>
  );
}

function ListSection({
  itemKey,
  estimatedMainAxisPx,
  header,
  children,
}: {
  itemKey: string;
  estimatedMainAxisPx: number;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <list-item
      item-key={itemKey}
      key={itemKey}
      estimated-main-axis-size-px={estimatedMainAxisPx}
    >
      <view
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {header}
        {children}
      </view>
    </list-item>
  );
}

export function M3PageContent({
  onNavigateToM3Nav,
}: {
  onNavigateToM3Nav?: () => void;
}) {
  const p = useExamplePalette();
  const [segSelected, setSegSelected] = useState("day");
  const shell = pageShellStyle(p.background);

  return (
    <>
      <list
        scroll-orientation="vertical"
        list-type="single"
        span-count={1}
        preload-buffer-count={1}
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          backgroundColor: shell.backgroundColor,
          listMainAxisGap: px(12),
          paddingLeft: px(16),
          paddingRight: px(16),
          paddingTop: px(16),
          paddingBottom: px(120),
        }}
      >
        <ListSection
          key="m3-section-buttons"
          itemKey="m3-section-buttons"
          estimatedMainAxisPx={ESTIMATE.BUTTON_STACK}
          header={
            <SectionHeader title="Buttons" color={p.onSurfaceVariant} />
          }
        >
          <Card variant="outlined">
            <view
              style={{
                display: "flex",
                flexDirection: "column",
                gap: px(10),
              }}
            >
              <Button label="Filled" variant="filled" onTap={() => {}} />
              <Button label="Tonal" variant="tonal" onTap={() => {}} />
              <Button label="Elevated" variant="elevated" onTap={() => {}} />
              <Button label="Outlined" variant="outlined" onTap={() => {}} />
              <Button label="Text" variant="text" onTap={() => {}} />
            </view>
          </Card>
        </ListSection>

        <ListSection
          key="m3-section-buttons-icons"
          itemKey="m3-section-buttons-icons"
          estimatedMainAxisPx={ESTIMATE.ICON_BUTTON_STACK}
          header={
            <SectionHeader
              title="Buttons with icons"
              color={p.onSurfaceVariant}
            />
          }
        >
          <Card variant="filled">
            <view
              style={{
                display: "flex",
                flexDirection: "column",
                gap: px(10),
              }}
            >
              <Button
                label="Add to cart"
                variant="filled"
                icon="add_shopping_cart"
                onTap={() => {}}
              />
              <Button
                label="Share"
                variant="tonal"
                icon="share"
                onTap={() => {}}
              />
              <Button
                label="Download"
                variant="outlined"
                icon="download"
                onTap={() => {}}
              />
              <Button
                label="Disabled"
                variant="filled"
                icon="block"
                disabled
                onTap={() => {}}
              />
            </view>
          </Card>
        </ListSection>

        <ListSection
          key="m3-section-cards"
          itemKey="m3-section-cards"
          estimatedMainAxisPx={ESTIMATE.CARD_TRIO_ROW}
          header={<SectionHeader title="Cards" color={p.onSurfaceVariant} />}
        >
          <view
            style={{
              display: "flex",
              flexDirection: "row",
              gap: px(8),
              flexWrap: "wrap",
            }}
          >
            <Card
              type="elevated"
              style={{
                flexGrow: 1,
                flexShrink: 1,
                flexBasis: "0px",
                minWidth: px(164),
              }}
            >
              <view
                style={{
                  minHeight: px(104),
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <view
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "flex-end",
                  }}
                >
                  <icon
                    icon="more_vert"
                    set="material"
                    size={24}
                    iconColor={p.onSurfaceVariant}
                  />
                </view>
                <text
                  style={{
                    fontSize: px(18),
                    lineHeight: px(24),
                    color: p.onSurface,
                  }}
                >
                  Elevated
                </text>
              </view>
            </Card>
            <Card
              type="filled"
              style={{
                flexGrow: 1,
                flexShrink: 1,
                flexBasis: "0px",
                minWidth: px(164),
              }}
            >
              <view
                style={{
                  minHeight: px(104),
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <view
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "flex-end",
                  }}
                >
                  <icon
                    icon="more_vert"
                    set="material"
                    size={24}
                    iconColor={p.onSurfaceVariant}
                  />
                </view>
                <text
                  style={{
                    fontSize: px(18),
                    lineHeight: px(24),
                    color: p.onSurface,
                  }}
                >
                  Filled
                </text>
              </view>
            </Card>
            <Card
              type="outlined"
              style={{
                flexGrow: 1,
                flexShrink: 1,
                flexBasis: "0px",
                minWidth: px(164),
              }}
            >
              <view
                style={{
                  minHeight: px(104),
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <view
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "flex-end",
                  }}
                >
                  <icon
                    icon="more_vert"
                    set="material"
                    size={24}
                    iconColor={p.onSurfaceVariant}
                  />
                </view>
                <text
                  style={{
                    fontSize: px(18),
                    lineHeight: px(24),
                    color: p.onSurface,
                  }}
                >
                  Outlined
                </text>
              </view>
            </Card>
          </view>
        </ListSection>

        <ListSection
          key="m3-section-button-group"
          itemKey="m3-section-button-group"
          estimatedMainAxisPx={ESTIMATE.BUTTON_GROUP_DUAL}
          header={
            <SectionHeader title="Button Group" color={p.onSurfaceVariant} />
          }
        >
          <Card variant="outlined">
            <view
              style={{
                display: "flex",
                flexDirection: "column",
                gap: px(12),
              }}
            >
              <ButtonGroup
                items={[
                  { value: "day", label: "Day" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                ]}
                selected={segSelected}
                onSelect={setSegSelected}
              />
              <ButtonGroup
                items={[
                  { value: "grid", icon: "grid_view" },
                  { value: "list", icon: "view_list" },
                  { value: "map", icon: "map" },
                ]}
                selected="list"
              />
            </view>
          </Card>
        </ListSection>

        <ListSection
          key="m3-section-fab"
          itemKey="m3-section-fab"
          estimatedMainAxisPx={ESTIMATE.FAB_ROW}
          header={
            <SectionHeader
              title="Floating Action Button"
              color={p.onSurfaceVariant}
            />
          }
        >
          <Card variant="outlined">
            <view
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: px(16),
                flexWrap: "wrap",
              }}
            >
              <Fab icon="add" size="small" onTap={() => {}} />
              <Fab icon="add" size="regular" onTap={() => {}} />
              <Fab icon="add" size="large" onTap={() => {}} />
              <Fab
                icon="edit"
                size="regular"
                colors={{
                  container: p.secondaryContainer,
                  icon: p.onSecondaryContainer,
                }}
                onTap={() => {}}
              />
            </view>
          </Card>
        </ListSection>

        <ListSection
          key="m3-section-extended-fab"
          itemKey="m3-section-extended-fab"
          estimatedMainAxisPx={ESTIMATE.EXTENDED_FAB_STACK}
          header={
            <SectionHeader title="Extended FAB" color={p.onSurfaceVariant} />
          }
        >
          <Card variant="filled">
            <view
              style={{
                display: "flex",
                flexDirection: "column",
                gap: px(10),
              }}
            >
              <ExtendedFab label="Compose" icon="edit" onTap={() => {}} />
              <ExtendedFab
                label="New Folder"
                icon="create_new_folder"
                colors={{
                  container: p.secondaryContainer,
                  label: p.onSecondaryContainer,
                  icon: p.onSecondaryContainer,
                }}
                onTap={() => {}}
              />
            </view>
          </Card>
        </ListSection>

        <ListSection
          key="m3-section-fab-menu"
          itemKey="m3-section-fab-menu"
          estimatedMainAxisPx={ESTIMATE.BODY_COPY}
          header={<SectionHeader title="FAB Menu" color={p.onSurfaceVariant} />}
        >
          <Card variant="outlined">
            <view
              style={{
                padding: px(4),
                display: "flex",
                flexDirection: "column",
              }}
            >
              <text
                style={{
                  fontSize: px(12),
                  lineHeight: px(18),
                  color: p.onSurfaceVariant,
                }}
              >
                The + button is pinned to the bottom-right of this screen (above the
                safe area). Tap it to open Camera, Gallery, and Audio.
              </text>
            </view>
          </Card>
        </ListSection>

        <ListSection
          key="m3-section-navigation"
          itemKey="m3-section-navigation"
          estimatedMainAxisPx={ESTIMATE.NAV_CTA}
          header={
            <SectionHeader title="Navigation" color={p.onSurfaceVariant} />
          }
        >
          <Card variant="outlined">
            <view
              style={{
                display: "flex",
                flexDirection: "column",
                gap: px(10),
              }}
            >
              <text style={{ fontSize: px(12), color: p.onSurfaceVariant }}>
                Drawer, rail, and nav bar use the shared M3 spacing, color, and
                active-indicator treatment from the app shell.
              </text>
              <Button
                label="Navigation Drawer + Rail"
                variant="tonal"
                icon="menu"
                onTap={() => onNavigateToM3Nav?.()}
              />
            </view>
          </Card>
        </ListSection>
      </list>

      <FabMenu
        icon="add"
        floating
        items={[
          { icon: "photo_camera", label: "Camera", onTap: () => {} },
          { icon: "image", label: "Gallery", onTap: () => {} },
          { icon: "mic", label: "Audio", onTap: () => {} },
        ]}
      />
    </>
  );
}

export default function M3Page() {
  const { push } = useTamerRouter();
  return <M3PageContent onNavigateToM3Nav={() => push("/m3/nav")} />;
}

import type { ReactNode } from '@lynx-js/react';
import { useEffect, useInitData, useState } from '@lynx-js/react';
import {
  Button,
  ButtonGroup,
  Card,
  ExtendedFab,
  Fab,
  FabMenu,
  px,
} from '@tamer4lynx/tamer-app-shell';
import { subscribeTamerNavTransitionEnd } from '@tamer4lynx/tamer-navigation';
import { useTamerRouter } from '@tamer4lynx/tamer-router';
import { pageShellStyle, useExamplePalette } from '../../examplePalette.js';

/** Keeps card chrome while buttons/FABs are deferred (matches rough inner height). */
function CardHeavySlot({ minHeight }: { minHeight: number }) {
  return (
    <view
      style={{
        width: '100%',
        minHeight: px(minHeight),
      }}
    />
  );
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <text
      style={{
        fontSize: px(12),
        fontWeight: '500',
        lineHeight: px(16),
        color,
        letterSpacing: '0.5px',
        marginBottom: px(12),
        marginTop: px(4),
      }}
    >
      {title.toUpperCase()}
    </text>
  );
}

function M3Section({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <view
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        marginBottom: px(12),
      }}
    >
      {header}
      {children}
    </view>
  );
}

function CardStackColumn({ gapPx, children }: { gapPx: number; children: ReactNode }) {
  return (
    <view
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: px(gapPx),
      }}
    >
      {children}
    </view>
  );
}

function CardStackRow({ gapPx, children }: { gapPx: number; children: ReactNode }) {
  return (
    <view
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: px(gapPx),
      }}
    >
      {children}
    </view>
  );
}

export function M3PageContent({
  onNavigateToM3Nav,
}: {
  onNavigateToM3Nav?: () => void;
}) {
  const p = useExamplePalette();
  const [segSelected, setSegSelected] = useState('day');
  const shell = pageShellStyle(p.background);
  const init = useInitData() as { route?: string } | null;
  const spokeBundle = typeof init?.route === 'string' && init.route.length > 0;
  const [heavyReady, setHeavyReady] = useState(() => !spokeBundle);

  useEffect(() => {
    'background only';
    if (!spokeBundle) return;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setHeavyReady(true);
    };

    const off = subscribeTamerNavTransitionEnd(finish);
    const safety = setTimeout(finish, 300);
    return () => {
      off();
      clearTimeout(safety);
    };
  }, [spokeBundle]);

  const btnGap = 10;
  const btnGroupGap = 12;
  const fabGap = 16;

  return (
    <>
      <scroll-view
        scroll-y
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          backgroundColor: shell.backgroundColor,
        }}
      >
        <view
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            paddingLeft: px(16),
            paddingRight: px(16),
            paddingTop: px(16),
            paddingBottom: px(120),
          }}
        >
          <M3Section
            header={<SectionHeader title="Buttons" color={p.onSurfaceVariant} />}
          >
            {heavyReady ? (
              <Card variant="outlined">
                <CardStackColumn gapPx={btnGap}>
                  <Button label="Filled" variant="filled" onTap={() => {}} />
                  <Button label="Tonal" variant="tonal" onTap={() => {}} />
                  <Button label="Elevated" variant="elevated" onTap={() => {}} />
                  <Button label="Outlined" variant="outlined" onTap={() => {}} />
                  <Button label="Text" variant="text" onTap={() => {}} />
                </CardStackColumn>
              </Card>
            ) : (
              <CardHeavySlot minHeight={220} />
            )}
          </M3Section>

          <M3Section
            header={
              <SectionHeader
                title="Buttons with icons"
                color={p.onSurfaceVariant}
              />
            }
          >
            {heavyReady ? (
              <Card variant="filled">
                <CardStackColumn gapPx={btnGap}>
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
                </CardStackColumn>
              </Card>
            ) : (
              <CardHeavySlot minHeight={200} />
            )}
          </M3Section>

          <M3Section header={<SectionHeader title="Cards" color={p.onSurfaceVariant} />}>
            <view
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: px(8),
                flexWrap: 'wrap',
              }}
            >
              <Card
                type="elevated"
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  flexBasis: '0px',
                  minWidth: px(164),
                }}
              >
                <view
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: px(12),
                    width: '100%',
                  }}
                >
                  <view
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
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
                      width: '100%',
                      textAlign: 'right',
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
                  flexBasis: '0px',
                  minWidth: px(164),
                }}
              >
                <view
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: px(12),
                    width: '100%',
                  }}
                >
                  <view
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
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
                      width: '100%',
                      textAlign: 'right',
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
                  flexBasis: '0px',
                  minWidth: px(164),
                }}
              >
                <view
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: px(12),
                    width: '100%',
                  }}
                >
                  <view
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
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
                      width: '100%',
                      textAlign: 'right',
                    }}
                  >
                    Outlined
                  </text>
                </view>
              </Card>
            </view>
          </M3Section>

          <M3Section
            header={
              <SectionHeader title="Button Group" color={p.onSurfaceVariant} />
            }
          >
            {heavyReady ? (
              <Card variant="outlined">
                <CardStackColumn gapPx={btnGroupGap}>
                  <ButtonGroup
                    items={[
                      { value: 'day', label: 'Day' },
                      { value: 'week', label: 'Week' },
                      { value: 'month', label: 'Month' },
                    ]}
                    selected={segSelected}
                    onSelect={setSegSelected}
                  />
                  <ButtonGroup
                    items={[
                      { value: 'grid', icon: 'grid_view' },
                      { value: 'list', icon: 'view_list' },
                      { value: 'map', icon: 'map' },
                    ]}
                    selected="list"
                  />
                </CardStackColumn>
              </Card>
            ) : (
              <CardHeavySlot minHeight={120} />
            )}
          </M3Section>

          <M3Section
            header={
              <SectionHeader
                title="Floating Action Button"
                color={p.onSurfaceVariant}
              />
            }
          >
            {heavyReady ? (
              <Card variant="outlined">
                <CardStackRow gapPx={fabGap}>
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
                </CardStackRow>
              </Card>
            ) : (
              <CardHeavySlot minHeight={72} />
            )}
          </M3Section>

          <M3Section
            header={
              <SectionHeader title="Extended FAB" color={p.onSurfaceVariant} />
            }
          >
            {heavyReady ? (
              <Card variant="filled">
                <CardStackColumn gapPx={btnGap}>
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
                </CardStackColumn>
              </Card>
            ) : (
              <CardHeavySlot minHeight={100} />
            )}
          </M3Section>

          <M3Section header={<SectionHeader title="FAB Menu" color={p.onSurfaceVariant} />}>
            <Card variant="outlined">
              <view
                style={{
                  padding: px(4),
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <text
                  style={{
                    fontSize: px(12),
                    lineHeight: px(18),
                    color: p.onSurfaceVariant,
                  }}
                >
                  The + button is pinned to the bottom-right of this screen (above
                  the safe area). Tap it to open Camera, Gallery, and Audio.
                </text>
              </view>
            </Card>
          </M3Section>

          <M3Section
            header={
              <SectionHeader title="Navigation" color={p.onSurfaceVariant} />
            }
          >
            <Card variant="outlined">
              <view
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: px(10),
                }}
              >
                <text style={{ fontSize: px(12), color: p.onSurfaceVariant }}>
                  Drawer, rail, and nav bar use the shared M3 spacing, color, and
                  active-indicator treatment from the app shell.
                </text>
                {heavyReady ? (
                  <Button
                    label="Navigation Drawer + Rail"
                    variant="tonal"
                    icon="menu"
                    onTap={() => onNavigateToM3Nav?.()}
                  />
                ) : (
                  <CardHeavySlot minHeight={48} />
                )}
              </view>
            </Card>
          </M3Section>
        </view>
      </scroll-view>

      {heavyReady ? (
        <FabMenu
          icon="add"
          floating
          items={[
            { icon: 'photo_camera', label: 'Camera', onTap: () => {} },
            { icon: 'image', label: 'Gallery', onTap: () => {} },
            { icon: 'mic', label: 'Audio', onTap: () => {} },
          ]}
        />
      ) : null}
    </>
  );
}

export default function M3Page() {
  const { push } = useTamerRouter();
  return <M3PageContent onNavigateToM3Nav={() => push('/m3/nav')} />;
}

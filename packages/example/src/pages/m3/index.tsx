import { useState } from '@lynx-js/react'
import { useTamerRouter } from '@tamer4lynx/tamer-router'
import {
  px,
  Button,
  ButtonGroup,
  Card,
  Fab,
  ExtendedFab,
  FabMenu,
} from '@tamer4lynx/tamer-app-shell'
import { useExamplePalette } from '../../examplePalette.js'

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <text style={{ fontSize: px(12), fontWeight: '500', lineHeight: px(16), color, letterSpacing: '0.5px', marginBottom: px(12), marginTop: px(4) }}>
      {title.toUpperCase()}
    </text>
  )
}

export default function M3Page() {
  const p = useExamplePalette()
  const { push } = useTamerRouter()

  const [segSelected, setSegSelected] = useState('day')
  const fabClearance = 96
  return (
    <view style={{ position: 'relative', minHeight: '100%', padding: px(16), paddingBottom: px(fabClearance), display: 'flex', flexDirection: 'column', backgroundColor: p.surface }}>

        {/* ── Buttons ── */}
        <SectionHeader title="Buttons" color={p.onSurfaceVariant} />
        <Card variant="outlined" style={{ marginBottom: px(12) }}>
          <view style={{ display: 'flex', flexDirection: 'column', gap: px(10) }}>
            <Button label="Filled" variant="filled" onTap={() => {}} />
            <Button label="Tonal" variant="tonal" onTap={() => {}} />
            <Button label="Elevated" variant="elevated" onTap={() => {}} />
            <Button label="Outlined" variant="outlined" onTap={() => {}} />
            <Button label="Text" variant="text" onTap={() => {}} />
          </view>
        </Card>

        {/* Buttons with icons */}
        <Card variant="filled" style={{ marginBottom: px(12) }}>
          <view style={{ display: 'flex', flexDirection: 'column', gap: px(10) }}>
            <Button label="Add to cart" variant="filled" icon="add_shopping_cart" onTap={() => {}} />
            <Button label="Share" variant="tonal" icon="share" onTap={() => {}} />
            <Button label="Download" variant="outlined" icon="download" onTap={() => {}} />
            <Button label="Disabled" variant="filled" icon="block" disabled onTap={() => {}} />
          </view>
        </Card>

        <SectionHeader title="Cards" color={p.onSurfaceVariant} />
        <view style={{ display: 'flex', flexDirection: 'row', gap: px(8), marginBottom: px(12), flexWrap: 'wrap' }}>
          <Card type="elevated" style={{ flexGrow: 1, flexShrink: 1, flexBasis: '0px', minWidth: px(164) }}>
            <view style={{ minHeight: px(104), display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
                <icon icon="more_vert" set="material" size={24} iconColor={p.onSurfaceVariant} />
              </view>
              <text style={{ fontSize: px(18), lineHeight: px(24), color: p.onSurface }}>Elevated</text>
            </view>
          </Card>
          <Card type="filled" style={{ flexGrow: 1, flexShrink: 1, flexBasis: '0px', minWidth: px(164) }}>
            <view style={{ minHeight: px(104), display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
                <icon icon="more_vert" set="material" size={24} iconColor={p.onSurfaceVariant} />
              </view>
              <text style={{ fontSize: px(18), lineHeight: px(24), color: p.onSurface }}>Filled</text>
            </view>
          </Card>
          <Card type="outlined" style={{ flexGrow: 1, flexShrink: 1, flexBasis: '0px', minWidth: px(164) }}>
            <view style={{ minHeight: px(104), display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <view style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
                <icon icon="more_vert" set="material" size={24} iconColor={p.onSurfaceVariant} />
              </view>
              <text style={{ fontSize: px(18), lineHeight: px(24), color: p.onSurface }}>Outlined</text>
            </view>
          </Card>
        </view>

        {/* ── Button Group ── */}
        <SectionHeader title="Button Group" color={p.onSurfaceVariant} />
        <Card variant="outlined" style={{ marginBottom: px(12) }}>
          <view style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
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
          </view>
        </Card>

        {/* ── FAB ── */}
        <SectionHeader title="Floating Action Button" color={p.onSurfaceVariant} />
        <Card variant="outlined" style={{ marginBottom: px(12) }}>
          <view style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: px(16), flexWrap: 'wrap' }}>
            <Fab icon="add" size="small" onTap={() => {}} />
            <Fab icon="add" size="regular" onTap={() => {}} />
            <Fab icon="add" size="large" onTap={() => {}} />
            <Fab icon="edit" size="regular" colors={{ container: p.secondaryContainer, icon: p.onSecondaryContainer }} onTap={() => {}} />
          </view>
        </Card>

        {/* Extended FAB */}
        <Card variant="filled" style={{ marginBottom: px(12) }}>
          <view style={{ display: 'flex', flexDirection: 'column', gap: px(10) }}>
            <ExtendedFab label="Compose" icon="edit" onTap={() => {}} />
            <ExtendedFab label="New Folder" icon="create_new_folder" colors={{ container: p.secondaryContainer, label: p.onSecondaryContainer, icon: p.onSecondaryContainer }} onTap={() => {}} />
          </view>
        </Card>

        {/* FAB Menu — primary FAB is fixed bottom-end; section describes it */}
        <SectionHeader title="FAB Menu" color={p.onSurfaceVariant} />
        <Card variant="outlined" style={{ marginBottom: px(12) }}>
          <text style={{ fontSize: px(12), lineHeight: px(18), color: p.onSurfaceVariant }}>
            The + button is pinned to the bottom-right of this screen (above the safe area). Tap it to open Camera, Gallery, and Audio.
          </text>
        </Card>

        {/* ── Navigation components ── */}
        <SectionHeader title="Navigation" color={p.onSurfaceVariant} />
        <Card variant="outlined">
          <view style={{ display: 'flex', flexDirection: 'column', gap: px(10) }}>
            <text style={{ fontSize: px(12), color: p.onSurfaceVariant }}>
              Drawer, rail, and nav bar use the shared M3 spacing, color, and active-indicator treatment from the app shell.
            </text>
            <Button label="Navigation Drawer + Rail" variant="tonal" icon="menu" onTap={() => push('/m3/nav')} />
          </view>
        </Card>

        <view style={{ height: px(24) }} />

      <FabMenu
        floating
        icon="add"
        items={[
          { icon: 'photo_camera', label: 'Camera', onTap: () => {} },
          { icon: 'image', label: 'Gallery', onTap: () => {} },
          { icon: 'mic', label: 'Audio', onTap: () => {} },
        ]}
      />
    </view>
  )
}

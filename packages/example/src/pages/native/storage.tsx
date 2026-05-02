import { useCallback, useEffect, useState } from '@lynx-js/react';
import { localStorage } from '@tamer4lynx/tamer-local-storage';

import '../../App.css';
import { Button, px } from '@tamer4lynx/tamer-app-shell';

import { pageShellStyle, useExamplePalette } from '../../examplePalette.js';

const REGISTRY_KEY = '__storage_keys__';

/** Row height hint for recycler; values + padding fit one–two lines. */
const STORAGE_ROW_ESTIMATE_PX = 96;
const STORAGE_EMPTY_ROW_ESTIMATE_PX = 40;

type StoreItem = { key: string; value: string };

const updateInputbyid = (id: string, value: string) => {
  lynx.createSelectorQuery()
       .select(`#${id}`)
       .invoke({
        method: 'setValue',
        params: {
          value
        },
        success: function (res) {},
        fail: function (res) {},
      })
      .exec();
}

function parseKeys(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr)
      ? arr.filter((k: unknown) => typeof k === 'string')
      : [];
  } catch {
    return [];
  }
}

export default function StoragePage() {
  const p = useExamplePalette();
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [items, setItems] = useState<StoreItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(() => {
    'background only';
    try {
      setError(null);
      const json = localStorage.getItem(REGISTRY_KEY);
      const keys = parseKeys(json).filter((k) => k !== REGISTRY_KEY);
      const next: StoreItem[] = [];
      for (const k of keys) {
        const v = localStorage.getItem(k);
        if (v !== null) next.push({ key: k, value: v });
      }
      setItems(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to read');
    }
  }, []);

  useEffect(() => {
    'background only';
    loadItems();
  }, [loadItems]);

  const handleSet = useCallback(() => {
    'background only';
    const k = key.trim();
    if (!k) return;
    try {
      setError(null);
      const json = localStorage.getItem(REGISTRY_KEY);
      const keys = parseKeys(json);
      if (!keys.includes(k)) keys.push(k);
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(keys));
      localStorage.setItem(k, value);
      setKey('');
      setValue('');
      updateInputbyid('key', '');
      updateInputbyid('value', '');
      loadItems();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  }, [key, value, loadItems]);

  const handleDeleteItem = useCallback(
    (itemKey: string) => {
      'background only';
      try {
        setError(null);
        const json = localStorage.getItem(REGISTRY_KEY);
        const keys = parseKeys(json).filter((k) => k !== itemKey);
        localStorage.setItem(REGISTRY_KEY, JSON.stringify(keys));
        localStorage.removeItem(itemKey);
        loadItems();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to delete');
      }
    },
    [loadItems],
  );

  const shell = pageShellStyle(p.surface);

  return (
    <view
      style={{
        ...shell,
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: px(24),
        gap: px(16),
      }}
    >
      <view
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: px(16),
        }}
      >
        <text
          className="Description"
          style={{ marginBottom: px(16), fontSize: px(14), color: p.onSurface }}
        >
          Uses @tamer4lynx/tamer-local-storage (SharedPreferences on Android,
          UserDefaults on iOS). Web-style localStorage API.
        </text>

        <view style={{ display: 'flex', flexDirection: 'column', gap: px(8) }}>
          <text className="Hint" style={{ marginBottom: px(4), fontSize: px(14), color: p.onSurface }}>
            Key
          </text>
          <input
            id="key"
            placeholder="Storage key"
            style={{
              backgroundColor: '#222',
              color: '#fff',
              padding: px(6, 6),
              borderRadius: '8px',
              border: '1px solid #444',
              fontSize: px(14),
              height: px(40),
            }}
            bindinput={(e) => setKey(e.detail.value)}
          />
        </view>

        <view
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: px(8),
            marginBottom: '16px',
          }}
        >
          <text className="Hint" style={{ marginBottom: px(4), fontSize: px(14), color: p.onSurface }}>
            Value
          </text>
          <input
            id="value"
            placeholder="Value to store"
            style={{
              backgroundColor: '#222',
              color: '#fff',
              padding: px(6, 6),
              borderRadius: '8px',
              border: '1px solid #444',
              fontSize: px(14),
              height: px(40),
            }}
            bindinput={(e) => setValue(e.detail.value)}
          />
        </view>

        {error && (
          <view
            style={{ padding: px(16), backgroundColor: '#4a2222', borderRadius: px(8) }}
          >
            <text className="Description" style={{ color: '#f88' }}>
              {error}
            </text>
          </view>
        )}

        <view
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: "space-between"
          }}
        >
          <Button
            label="Add"
            onTap={handleSet}
            variant="filled"
            size="sm"
            style={{ flex: 1, minWidth: "49%" }}
          />
          <Button
            label="Refresh"
            onTap={loadItems}
            variant="filled"
            size="sm"
            style={{ flex: 1, minWidth: "49%" }}
          />
        </view>
      </view>

      <view
        style={{
          flex: 1,
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: '0px',
          minHeight: px(160),
          width: '100%',
          marginTop: px(8),
          position: 'relative',
        }}
      >
        <text className="Hint" style={{ marginBottom: px(8), color: p.onSurface }}>
          Stored items ({items.length})
        </text>
        <list
          scroll-orientation="vertical"
          list-type="single"
          span-count={1}
          preload-buffer-count={1}
          style={{
            position: 'absolute',
            left: '0px',
            right: '0px',
            top: px(36),
            bottom: '0px',
            width: '100%',
            listMainAxisGap: px(8),
          }}
        >
          {items.length === 0 ? (
            <list-item
              item-key="storage-empty"
              key="storage-empty"
              estimated-main-axis-size-px={STORAGE_EMPTY_ROW_ESTIMATE_PX}
            >
              <text className="Description" style={{ color: p.onSurface }}>
                (empty)
              </text>
            </list-item>
          ) : (
            items.map((item) => (
              <list-item
                item-key={`storage-item:${item.key}`}
                key={item.key}
                estimated-main-axis-size-px={STORAGE_ROW_ESTIMATE_PX}
              >
                <view
                  style={{
                    padding: px(16),
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    border: '1px solid #333',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: px(16),
                  }}
                >
                  <view style={{ flex: 1, minWidth: '0px' }}>
                    <text className="Hint" style={{ marginBottom: px(4) }}>
                      {item.key}
                    </text>
                    <text className="Description">{item.value}</text>
                  </view>
                  <Button
                    label="Delete"
                    onTap={() => {
                      'background only';
                      handleDeleteItem(item.key);
                    }}
                    variant="filled"
                    size="sm"
                    shape="square"
                    colors={{ container: '#552222', label: '#f88' }}
                    style={{ flexShrink: 0 }}
                  />
                </view>
              </list-item>
            ))
          )}
        </list>
      </view>
    </view>
  );
}

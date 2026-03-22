import { useCallback, useEffect, useState } from '@lynx-js/react'
import { localStorage } from '@tamer4lynx/tamer-local-storage'

import '../../App.css'
import { px } from '@tamer4lynx/tamer-app-shell'

const REGISTRY_KEY = '__storage_keys__'

type StoreItem = { key: string; value: string }

function parseKeys(json: string | null): string[] {
  if (!json) return []
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) ? arr.filter((k: unknown) => typeof k === 'string') : []
  } catch {
    return []
  }
}

export default function StoragePage() {
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [items, setItems] = useState<StoreItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadItems = useCallback(() => {
    'background only'
    try {
      setError(null)
      const json = localStorage.getItem(REGISTRY_KEY)
      const keys = parseKeys(json).filter((k) => k !== REGISTRY_KEY)
      const next: StoreItem[] = []
      for (const k of keys) {
        const v = localStorage.getItem(k)
        if (v !== null) next.push({ key: k, value: v })
      }
      setItems(next)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to read')
    }
  }, [])

  useEffect(() => {
    'background only'
    loadItems()
  }, [loadItems])

  const handleSet = useCallback(() => {
    'background only'
    const k = key.trim()
    if (!k) return
    try {
      setError(null)
      const json = localStorage.getItem(REGISTRY_KEY)
      const keys = parseKeys(json)
      if (!keys.includes(k)) keys.push(k)
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(keys))
      localStorage.setItem(k, value)
      setKey('')
      setValue('')
      loadItems()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    }
  }, [key, value, loadItems])

  const handleDeleteItem = useCallback(
    (itemKey: string) => {
      'background only'
      try {
        setError(null)
        const json = localStorage.getItem(REGISTRY_KEY)
        const keys = parseKeys(json).filter((k) => k !== itemKey)
        localStorage.setItem(REGISTRY_KEY, JSON.stringify(keys))
        localStorage.removeItem(itemKey)
        loadItems()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to delete')
      }
    },
    [loadItems]
  )

  return (
    <scroll-view style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <text className="Description" style={{ marginBottom: 16, fontSize: px(14), }}>
        Uses @tamer4lynx/tamer-local-storage (SharedPreferences on Android, UserDefaults on iOS). Web-style
        localStorage API.
      </text>

      <view style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <text className="Hint" style={{ marginBottom: 4, fontSize: px(14) }}>Key</text>
        <input
          value={key}
          placeholder="Storage key"
          style={{
            backgroundColor: '#222',
            color: '#fff',
            padding: px(6, 6),
            borderRadius: "8px",
            border: '1px solid #444',
            fontSize: px(14),
            height: px(40),
          }}
          bindinput={(e) => setKey(e.detail.value)}
        />
      </view>

      <view style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: "16px" }}>
        <text className="Hint" style={{ marginBottom: 4, fontSize: px(14) }}>Value</text>
        <input
          value={value}
          placeholder="Value to store"
          style={{
            backgroundColor: '#222',
            color: '#fff',
            padding: px(6, 6),
            borderRadius: "8px",
            border: '1px solid #444',
            fontSize: px(14),
            height: px(40),
          }}
          bindinput={(e) => setValue(e.detail.value)}
        />
      </view>

      {error && (
        <view style={{ padding: 16, backgroundColor: '#4a2222', borderRadius: 8 }}>
          <text className="Description" style={{ color: '#f88' }}>{error}</text>
        </view>
      )}

      <view style={{ display: 'flex', flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        <view className="Button" style={{ flex: 1, minWidth: 80 }} bindtap={handleSet}>
          <text className="ButtonText">Add</text>
        </view>
        <view className="Button" style={{ flex: 1, minWidth: 80 }} bindtap={loadItems}>
          <text className="ButtonText">Refresh</text>
        </view>
      </view>

      <view style={{ marginTop: 8 }}>
        <text className="Hint" style={{ marginBottom: 8 }}>Stored items ({items.length})</text>
        {items.length === 0 ? (
          <text className="Description" style={{ color: '#888' }}>(empty)</text>
        ) : (
          <view style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item) => (
              <view
                key={item.key}
                style={{
                  padding: 16,
                  backgroundColor: '#1a1a1a',
                  borderRadius: "8px",
                  border: '1px solid #333',
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <view style={{ flex: 1, minWidth: 0 }}>
                  <text className="Hint" style={{ marginBottom: 4 }}>{item.key}</text>
                  <text className="Description">{item.value}</text>
                </view>
                <view
                  bindtap={() => handleDeleteItem(item.key)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: "8px",
                    backgroundColor: '#552222',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <text className="ButtonText" style={{ color: '#f88' }}>Delete</text>
                </view>
              </view>
            ))}
          </view>
        )}
      </view>
    </scroll-view>
  )
}

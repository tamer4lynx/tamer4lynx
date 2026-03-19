import { useCallback, useEffect, useMemo, useState } from '@lynx-js/react'
import { useInitData } from '@lynx-js/react'
import { getItemAsync, setItemAsync, deleteItemAsync } from '@tamer4lynx/tamer-secure-store'

import '../../App.css'

const REGISTRY_KEY = '__storage_keys__'

function keychainServiceWithTamerIdentity(initData: unknown, baseService = 'key_v1'): string {
  if (initData == null || typeof initData !== 'object') return baseService
  const key = (initData as Record<string, unknown>).tamerAppKey
  if (typeof key !== 'string' || !key.trim()) return baseService
  return `${baseService}:${key.trim()}`
}

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
  const initData = useInitData()
  const storeOpts = useMemo(() => ({ keychainService: keychainServiceWithTamerIdentity(initData) }), [initData])

  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [items, setItems] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadItems = useCallback(() => {
    'background only'
    setLoading(true)
    setError(null)
    getItemAsync(REGISTRY_KEY, storeOpts)
      .then((json: string | null) => {
        const keys = parseKeys(json).filter((k) => k !== REGISTRY_KEY)
        return Promise.all(
          keys.map((k) =>
            getItemAsync(k, storeOpts).then((v: string | null) => (v !== null ? { key: k, value: v } : null))
          )
        ).then((results) => results.filter((r: StoreItem | null): r is StoreItem => r !== null))
      })
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to read'))
      .finally(() => setLoading(false))
  }, [storeOpts])

  useEffect(() => {
    'background only'
    loadItems()
  }, [loadItems])

  const handleSet = useCallback(() => {
    'background only'
    const k = key.trim()
    if (!k) return
    setLoading(true)
    setError(null)
    getItemAsync(REGISTRY_KEY, storeOpts)
      .then((json: string | null) => {
        const keys = parseKeys(json)
        if (!keys.includes(k)) keys.push(k)
        return setItemAsync(REGISTRY_KEY, JSON.stringify(keys), storeOpts).then(() =>
          setItemAsync(k, value, storeOpts).then(() => {
            setKey('')
            setValue('')
            return loadItems()
          })
        )
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to save'))
      .finally(() => setLoading(false))
  }, [key, value, loadItems, storeOpts])

  const handleDeleteItem = useCallback(
    (itemKey: string) => {
      'background only'
      setLoading(true)
      setError(null)
      getItemAsync(REGISTRY_KEY, storeOpts)
        .then((json: string | null) => {
          const keys = parseKeys(json).filter((k) => k !== itemKey)
          return setItemAsync(REGISTRY_KEY, JSON.stringify(keys), storeOpts).then(() =>
            deleteItemAsync(itemKey, storeOpts).then(loadItems)
          )
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to delete'))
        .finally(() => setLoading(false))
    },
    [loadItems, storeOpts]
  )

  return (
    <scroll-view style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <text className="Title" style={{ marginBottom: 8 }}>Local Storage Test</text>
      <text className="Description" style={{ marginBottom: 16 }}>
        Uses tamer-secure-store. Keychain service includes tamerAppKey from host initData when present, so the same keys apply when loading from different dev server URLs.
      </text>

      <view style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <text className="Hint" style={{ marginBottom: 4 }}>Key</text>
        <input
          value={key}
          placeholder="Storage key"
          style={{
            backgroundColor: '#222',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: "8px",
            border: '1px solid #444',
            fontSize: "24px",
            height: "48px",
          }}
          bindinput={(e) => setKey(e.detail.value)}
        />
      </view>

      <view style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: "16px" }}>
        <text className="Hint" style={{ marginBottom: 4 }}>Value</text>
        <input
          value={value}
          placeholder="Value to store"
          style={{
            backgroundColor: '#222',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: "8px",
            border: '1px solid #444',
            fontSize: "24px",
            height: "48px",
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
        {loading ? (
          <text className="Description">Loading...</text>
        ) : items.length === 0 ? (
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

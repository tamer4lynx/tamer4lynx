import { useCallback, useEffect, useState } from '@lynx-js/react'
import { getItemAsync, setItemAsync } from '@tamer4lynx/tamer-secure-store'
import { authenticateAsync, type AuthenticateResult } from '@tamer4lynx/tamer-biometric'

import '../App.css'

const FLAG_KEY = 'secure-number-exists'
const NUMBER_KEY = 'secure-number'

export default function SecurePage() {
  const [hasNumber, setHasNumber] = useState<boolean | null>(null)
  const [displayValue, setDisplayValue] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkExists = useCallback(() => {
    'background only'
    setLoading(true)
    setError(null)
    getItemAsync(FLAG_KEY)
      .then((v: string | null) => setHasNumber(v === '1'))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to check'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    'background only'
    checkExists()
  }, [checkExists])

  const handleSetNumber = useCallback(() => {
    'background only'
    setLoading(true)
    setError(null)
    authenticateAsync({ promptMessage: 'Authenticate to save your number' })
      .then((r: AuthenticateResult) => {
        if (!r.success) {
          setError(r.error ?? 'Authentication failed')
          return
        }
        const num = Math.floor(Math.random() * 1_000_000).toString()
        return setItemAsync(NUMBER_KEY, num).then(() =>
          setItemAsync(FLAG_KEY, '1').then(() => {
            setHasNumber(true)
            setDisplayValue(null)
          })
        )
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to save'))
      .finally(() => setLoading(false))
  }, [])

  const handleViewNumber = useCallback(() => {
    'background only'
    setLoading(true)
    setError(null)
    authenticateAsync({ promptMessage: 'Authenticate to view your number' })
      .then((r: AuthenticateResult) => {
        if (!r.success) {
          setError(r.error ?? 'Authentication failed')
          return
        }
        return getItemAsync(NUMBER_KEY).then((v: string | null) => setDisplayValue(v ?? ''))
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to read'))
      .finally(() => setLoading(false))
  }, [])

  const handleChangeNumber = useCallback(() => {
    'background only'
    setLoading(true)
    setError(null)
    authenticateAsync({ promptMessage: 'Authenticate to change your number' })
      .then((r: AuthenticateResult) => {
        if (!r.success) {
          setError(r.error ?? 'Authentication failed')
          return
        }
        const num = Math.floor(Math.random() * 1_000_000).toString()
        return setItemAsync(NUMBER_KEY, num).then(() => {
          setDisplayValue(num)
        })
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to change'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <view style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <text className="Description" style={{ marginBottom: 16 }}>
        Store a random number with biometric protection.
      </text>

      {loading && <text className="Description">Loading...</text>}
      {error && (
        <view style={{ padding: 16, backgroundColor: '#fee', borderRadius: 8 }}>
          <text className="Description" style={{ color: '#c00' }}>{error}</text>
        </view>
      )}

      {hasNumber === null && !loading && (
        <text className="Description">Checking...</text>
      )}

      {hasNumber === false && (
        <view style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <text className="Description" style={{ marginBottom: 8 }}>No number saved yet.</text>
          <view className="Button" bindtap={handleSetNumber}>
            <text className="ButtonText">Set random number</text>
          </view>
        </view>
      )}

      {hasNumber === true && (
        <view style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <view
            style={{
              padding: "4px 24px",
              backgroundColor: '#555',
              borderRadius: "8px",
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: "48px",
            }}
          >
            <text className="Title">
              {displayValue ?? '••••••'}
            </text>
          </view>
          <view className="Button" bindtap={handleViewNumber}>
            <text className="ButtonText">View number</text>
          </view>
          <view className="Button" bindtap={handleChangeNumber}>
            <text className="ButtonText">Change number</text>
          </view>
        </view>
      )}
    </view>
  )
}

import { useCallback, useEffect, useState } from '@lynx-js/react'
import { getItemAsync, setItemAsync } from 'tamer-secure-store'
import { authenticateAsync, type AuthenticateResult } from 'tamer-biometric'

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
    <view style={{ padding: 32, flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <text style={{ fontSize: 32, color: '#aaa' }}>
        Store a random number with biometric protection.
      </text>

      {loading && (
        <text style={{ fontSize: 32, color: '#aaa' }}>Loading...</text>
      )}
      {error && (
        <view style={{ padding: 28, backgroundColor: '#fee', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <text style={{ fontSize: 32, color: '#c00' }}>{error}</text>
        </view>
      )}

      {hasNumber === null && !loading && (
        <text style={{ fontSize: 32, color: '#aaa' }}>Checking...</text>
      )}

      {hasNumber === false && (
        <view style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <text style={{ fontSize: 32, color: '#aaa' }}>No number saved yet.</text>
          <view
            bindtap={handleSetNumber}
            style={{
              padding: 28,
              backgroundColor: '#555',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <text style={{ fontSize: 48 }}>Set random number</text>
          </view>
        </view>
      )}

      {hasNumber === true && (
        <view style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <view
            style={{
              padding: 28,
              backgroundColor: '#555',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              justifyContent: 'center',
            }}
          >
            <text style={{ fontSize: 48 }}>
              {displayValue ?? '••••••'}
            </text>
          </view>
          <view
            bindtap={handleViewNumber}
            style={{
              padding: 28,
              backgroundColor: '#555',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <text style={{ fontSize: 48 }}>View number</text>
          </view>
          <view
            bindtap={handleChangeNumber}
            style={{
              padding: 28,
              backgroundColor: '#555',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <text style={{ fontSize: 48 }}>Change number</text>
          </view>
        </view>
      )}
    </view>
  )
}

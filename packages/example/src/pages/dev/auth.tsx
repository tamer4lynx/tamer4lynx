import { useCallback, useState } from '@lynx-js/react'
import { AuthRequest, exchangeCodeAsync } from 'tamer-auth'
import { oauthConfig } from '../../oauth-config.js'
import { px } from 'tamer-app-shell'
import { useScreenOptions } from 'tamer-router'

const discovery = {
  authorizationEndpoint: oauthConfig.authorizationEndpoint,
  tokenEndpoint: oauthConfig.tokenEndpoint,
}

export default function AuthPage() {
  useScreenOptions({ title: 'OAuth 0' })
  const [status, setStatus] = useState<string>('')
  const [token, setToken] = useState<string | null>(null)

  const startAuth = useCallback(() => {
    'background only'
    if (!oauthConfig.clientId) {
      setStatus('Missing OAUTH_CLIENT_ID in .env')
      return
    }
    setStatus('Starting...')
    const redirectUri = oauthConfig.redirectUri
    const request = new AuthRequest({
      clientId: oauthConfig.clientId,
      redirectUri,
      scopes: oauthConfig.scope.split(' '),
      usePKCE: false,
    })
    request.promptAsync(discovery).catch((e: Error) => {
      setStatus(`Error: ${e?.message ?? e}`)
      return null
    }).then((result: import('tamer-auth').AuthSessionResult | null) => {
      if (!result) return
      if (result.type === 'success') {
        if (result.authentication) {
          setToken(result.authentication.accessToken)
          setStatus('Got token (implicit flow)')
        } else if (result.params.code) {
          setStatus('Exchanging code...')
          exchangeCodeAsync(
            {
              clientId: oauthConfig.clientId,
              clientSecret: oauthConfig.clientSecret || undefined,
              redirectUri,
              code: result.params.code,
              codeVerifier: request.codeVerifier ?? '',
            },
            discovery
          )
            .then((t: import('tamer-auth').TokenResponse) => {
              setToken(t.accessToken)
              setStatus('Success')
            })
            .catch((e: Error) => setStatus(`Exchange error: ${e.message}`))
        } else {
          setStatus(JSON.stringify(result.params))
        }
      } else if (result.type === 'cancel') {
        setStatus('Cancelled')
      } else {
        setStatus(`Error: ${(result as { error?: Error }).error?.message ?? 'unknown'}`)
      }
    }).catch((e: Error) => setStatus(`Error: ${e?.message ?? e}`))
  }, [])

  return (
    <view style={{ padding: px(32), display: 'flex', flexDirection: 'column', gap: px(24) }}>
      <text style={{ fontSize: px(18), color: '#aaa' }}>
        Beeceptor mock - authorization code flow
      </text>
      <view
        style={{
          padding: px(8),
          backgroundColor: '#555',
          borderRadius: px(6),
          display: 'flex',
          flexDirection: 'column',
          gap: px(8),
        }}
        bindtap={startAuth}
      >
        <text style={{ fontSize: px(18) }}>Sign in with OAuth</text>
      </view>
      {status ? (
        <text style={{ fontSize: px(18), color: '#aaa' }}>{status}</text>
      ) : null}
      {token ? (
        <text style={{ fontSize: px(18), color: '#aaa', wordBreak: 'break-all' }}>
          Token: {token.slice(0, 20)}...
        </text>
      ) : null}
    </view>
  )
}

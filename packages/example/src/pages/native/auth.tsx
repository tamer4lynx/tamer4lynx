import { useCallback, useState } from '@lynx-js/react';
import { Button, px } from '@tamer4lynx/tamer-app-shell';
import { AuthRequest, exchangeCodeAsync } from '@tamer4lynx/tamer-auth';
import { useScreenOptions } from '@tamer4lynx/tamer-router';
import { pageShellStyle, useExamplePalette } from '../../examplePalette.js';
import { oauthConfig } from '../../oauth-config.js';

const discovery = {
  authorizationEndpoint: oauthConfig.authorizationEndpoint,
  tokenEndpoint: oauthConfig.tokenEndpoint,
};

export default function AuthPage() {
  const p = useExamplePalette();
  useScreenOptions({ title: 'OAuth 0' });
  const [status, setStatus] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);

  const startAuth = useCallback(() => {
    'background only';
    if (!oauthConfig.clientId) {
      setStatus('Missing OAUTH_CLIENT_ID in .env');
      return;
    }
    setStatus('Starting...');
    const redirectUri = oauthConfig.redirectUri;
    const request = new AuthRequest({
      clientId: oauthConfig.clientId,
      redirectUri,
      scopes: oauthConfig.scope.split(' '),
      usePKCE: false,
    });
    request
      .promptAsync(discovery)
      .catch((e: Error) => {
        setStatus(`Error: ${e?.message ?? e}`);
        return null;
      })
      .then(
        (result: import('@tamer4lynx/tamer-auth').AuthSessionResult | null) => {
          if (!result) return;
          if (result.type === 'success') {
            if (result.authentication) {
              setToken(result.authentication.accessToken);
              setStatus('Got token (implicit flow)');
            } else if (result.params.code) {
              setStatus('Exchanging code...');
              exchangeCodeAsync(
                {
                  clientId: oauthConfig.clientId,
                  clientSecret: oauthConfig.clientSecret || undefined,
                  redirectUri,
                  code: result.params.code,
                  codeVerifier: request.codeVerifier ?? '',
                },
                discovery,
              )
                .then((t: import('@tamer4lynx/tamer-auth').TokenResponse) => {
                  setToken(t.accessToken);
                  setStatus('Success');
                })
                .catch((e: Error) => setStatus(`Exchange error: ${e.message}`));
            } else {
              setStatus(JSON.stringify(result.params));
            }
          } else if (result.type === 'cancel') {
            setStatus('Cancelled');
          } else {
            setStatus(
              `Error: ${(result as { error?: Error }).error?.message ?? 'unknown'}`,
            );
          }
        },
      )
      .catch((e: Error) => setStatus(`Error: ${e?.message ?? e}`));
  }, []);

  return (
    <view
      style={{
        ...pageShellStyle(p.surface),
        padding: px(32),
        gap: px(24),
      }}
    >
      <text style={{ fontSize: px(18), color: p.onSurfaceVariant }}>
        Beeceptor mock - authorization code flow
      </text>
      <Button
        label="Sign in with OAuth"
        onTap={startAuth}
        variant="filled"
        size="sm"
        style={{ width: '100%', alignSelf: 'stretch' }}
      />
      {status ? (
        <text style={{ fontSize: px(18), color: p.onSurfaceVariant }}>
          {status}
        </text>
      ) : null}
      {token ? (
        <text
          style={{
            fontSize: px(18),
            color: p.onSurfaceVariant,
            wordBreak: 'break-all',
          }}
        >
          Token: {token.slice(0, 20)}...
        </text>
      ) : null}
    </view>
  );
}

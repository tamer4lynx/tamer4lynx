declare const __OAUTH_CLIENT_ID__: string
declare const __OAUTH_CLIENT_SECRET__: string
declare const __OAUTH_AUTHORIZATION_ENDPOINT__: string
declare const __OAUTH_TOKEN_ENDPOINT__: string
declare const __OAUTH_SCOPE__: string
declare const __OAUTH_REDIRECT_URI__: string

export const oauthConfig = {
  clientId: typeof __OAUTH_CLIENT_ID__ !== 'undefined' ? __OAUTH_CLIENT_ID__ : '',
  clientSecret: typeof __OAUTH_CLIENT_SECRET__ !== 'undefined' ? __OAUTH_CLIENT_SECRET__ : '',
  authorizationEndpoint: typeof __OAUTH_AUTHORIZATION_ENDPOINT__ !== 'undefined' ? __OAUTH_AUTHORIZATION_ENDPOINT__ : 'https://authorization-server.com/authorize',
  tokenEndpoint: typeof __OAUTH_TOKEN_ENDPOINT__ !== 'undefined' ? __OAUTH_TOKEN_ENDPOINT__ : 'https://authorization-server.com/token',
  scope: typeof __OAUTH_SCOPE__ !== 'undefined' ? __OAUTH_SCOPE__ : 'photo offline_access',
  redirectUri: typeof __OAUTH_REDIRECT_URI__ !== 'undefined' ? __OAUTH_REDIRECT_URI__ : 'tamerdevapp://auth/callback',
}

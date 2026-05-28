// apps/utility/src/mcp/oauth/index.ts
// Reusable OAuth 2.0 authorization-code-with-PKCE primitives.
// NetSuite consumes these today; Gmail (TRACK 4/5) should refactor onto them next.
export { generatePkcePair, generateState, type PkcePair } from './pkce.js';
export {
  waitForOAuthRedirect,
  OAuthLoopbackError,
  OAUTH_LOOPBACK_PORT,
  OAUTH_LOOPBACK_PATH,
  OAUTH_REDIRECT_URI,
  type LoopbackOptions,
  type LoopbackResult,
} from './loopbackServer.js';
export {
  runAuthorizationCodeFlow,
  exchangeCodeForTokens,
  refreshAccessToken,
  buildAuthorizeUrl,
  OAuthFlowError,
  type OAuthProviderConfig,
  type OAuthTokenSet,
} from './authCodeFlow.js';
export {
  OAuthTokenStore,
  OAuthTokenStoreError,
  REFRESH_SKEW_MS,
} from './tokenStore.js';

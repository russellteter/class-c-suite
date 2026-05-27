// apps/utility/src/mcp/gmail/index.ts
export { GmailClient } from './client.js';
export {
  recentThreadsByStakeholderQuery,
  recentExecCorrespondenceQuery,
  assertSafeEmail,
  assertSafeKeyword,
  toGmailDate,
} from './typed-queries.js';
export type {
  RecentThreadsByStakeholderArgs,
  RecentExecCorrespondenceArgs,
} from './typed-queries.js';
export {
  GmailError,
  GmailAuthExpiredError,
  GmailAuthRevokedError,
  GmailThreadNotFoundError,
  GmailRateLimitedError,
  GmailNetworkError,
  GmailVaultError,
  GmailOAuthAppMissingError,
} from './errors.js';
export { runOAuthFlow, refreshAccessToken } from './oauth-flow.js';
export type { GmailTokenSet } from './oauth-flow.js';

// apps/utility/src/mcp/chorus/index.ts
export { ChorusClient } from './client.js';
export {
  recentCallsForStakeholderQuery,
  callsByAccountIdQuery,
} from './typed-queries.js';
export type { RecentCallsForStakeholderArgs, CallsByAccountIdArgs } from './typed-queries.js';
export { CHORUS_CONFIDENCE_CAP, withConfidenceCap } from './confidence-cap.js';
export type { ChorusSourceTag } from './confidence-cap.js';
export {
  ChorusError,
  ChorusAPIKeyMissingError,
  ChorusAuthExpiredError,
  ChorusRateLimitedError,
} from './errors.js';

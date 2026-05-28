// apps/utility/src/orchestrator/stubGuard.ts
// Source: docs/reviews/mock-reliance-audit-2026-05-28.md (Findings 2-5) + B47 + DOCTRINE #1.
//
// Live-mode stub-data guard. When STUB_MODE=live, a playbook that still fabricates
// data (non-empty STUBBED_SOURCES) must NOT silently emit fabricated tool-call
// results or hardcoded engine scores as if they were real. That is the exact
// failure the mock-reliance audit caught.
//
// Default behavior (live + stubbed): REFUSE — throw StubbedSourceLiveError. Truth
// over the appearance of completion.
//
// Escape hatch (ALLOW_STUBBED_LIVE=1): downgrade to a loud warning and return the
// stubbed sources so the caller merges them into the result's degradedSources,
// matching the honest-degradation pattern (audit Finding 6). For dev only.
//
// replay/record modes never trigger the guard — fabricated fixtures are the point.

import { createLogger } from '../logger.js';
import type {
  PlaybookId,
  PlaybookModule,
  PlaybookInput,
  PlaybookContext,
  PlaybookResult,
  StubbedSource,
} from '@c-suite/shared-types/playbook';

const log = createLogger();

export class StubbedSourceLiveError extends Error {
  constructor(
    public readonly playbookId: string,
    public readonly stubbedSources: readonly StubbedSource[],
  ) {
    super(
      `Refusing to run playbook '${playbookId}' under STUB_MODE=live: it still ` +
        `fabricates [${stubbedSources.join(', ')}]. Emitting this as real output ` +
        `would violate DOCTRINE #1 (truth over the appearance of completion). ` +
        `Wire the real sources, or set ALLOW_STUBBED_LIVE=1 to proceed with these ` +
        `flagged as degraded_sources (dev only).`,
    );
    this.name = 'StubbedSourceLiveError';
  }
}

function isLive(): boolean {
  return (process.env.STUB_MODE ?? 'replay') === 'live';
}

/**
 * Apply the live-mode stub guard for a playbook about to run.
 *
 * @returns the stubbed sources to merge into degradedSources when the ALLOW_STUBBED_LIVE
 *          escape hatch is active. Empty array in every other case.
 * @throws  StubbedSourceLiveError when STUB_MODE=live, the playbook has stubbed
 *          sources, and ALLOW_STUBBED_LIVE is not set.
 */
export function guardStubbedSourcesLive(
  playbookId: PlaybookId | string,
  module: Pick<PlaybookModule, 'STUBBED_SOURCES'>,
): readonly StubbedSource[] {
  const stubbed = module.STUBBED_SOURCES ?? [];
  if (!isLive() || stubbed.length === 0) return [];

  if (process.env.ALLOW_STUBBED_LIVE === '1') {
    log.warn({
      message:
        `STUB_MODE=live but playbook '${playbookId}' still fabricates ` +
        `[${stubbed.join(', ')}]. ALLOW_STUBBED_LIVE=1 set — proceeding with these ` +
        `flagged as degraded_sources. This output is NOT fully real.`,
    });
    return stubbed;
  }

  throw new StubbedSourceLiveError(playbookId, stubbed);
}

/**
 * Run a playbook through the live-mode guard. All production call sites should use
 * this instead of calling module.runPlaybook directly, so the guard is enforced in
 * exactly one place. When the ALLOW_STUBBED_LIVE escape hatch downgrades the guard,
 * the stubbed sources are merged into the result's degradedSources.
 */
export async function runPlaybookGuarded(
  module: PlaybookModule,
  playbookId: PlaybookId | string,
  input: PlaybookInput,
  ctx: PlaybookContext,
): Promise<PlaybookResult> {
  const stubDegraded = guardStubbedSourcesLive(playbookId, module);
  const result = await module.runPlaybook(input, ctx);
  if (stubDegraded.length === 0) return result;

  const merged = Array.from(new Set([...result.degradedSources, ...stubDegraded]));
  return { ...result, degradedSources: merged };
}

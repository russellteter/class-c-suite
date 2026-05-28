// apps/utility/src/mcp/chorus/errors.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §8 + BLOCKERS B11

export class ChorusError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ChorusError';
  }
}

/** API key missing from vault and CHORUS_API_KEY env var — Russell must paste it. */
export class ChorusAPIKeyMissingError extends ChorusError {
  constructor() {
    super(
      'Chorus API key not configured. ' +
      'Set CHORUS_API_KEY env var or complete onboarding to store via safeStorage.'
    );
    this.name = 'ChorusAPIKeyMissingError';
  }
}

/** API key rejected by Chorus (401/403) — re-authentication required. */
export class ChorusAuthExpiredError extends ChorusError {
  constructor(message = 'Chorus API key rejected — re-authenticate via reconnect()') {
    super(message);
    this.name = 'ChorusAuthExpiredError';
  }
}

/** Chorus API rate limit exceeded (429). */
export class ChorusRateLimitedError extends ChorusError {
  constructor(public readonly retryAfterSeconds?: number) {
    super(
      retryAfterSeconds
        ? `Chorus rate limited — retry after ${retryAfterSeconds}s`
        : 'Chorus rate limited — back off and retry'
    );
    this.name = 'ChorusRateLimitedError';
  }
}

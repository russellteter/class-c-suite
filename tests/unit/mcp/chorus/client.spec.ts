// tests/unit/mcp/chorus/client.spec.ts
// Tests for ChorusClient: auth, B11 cap stamp on all methods, error paths.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChorusClient } from '../../../../apps/utility/src/mcp/chorus/client.js';
import {
  ChorusAPIKeyMissingError,
  ChorusAuthExpiredError,
  ChorusRateLimitedError,
} from '../../../../apps/utility/src/mcp/chorus/errors.js';
import { CHORUS_CONFIDENCE_CAP } from '../../../../apps/utility/src/mcp/chorus/confidence-cap.js';
import type { SafeStorageVault } from '../../../../apps/utility/src/credentials/safeStorageVault.js';

// ── Fake vault ───────────────────────────────────────────────────────────────

function makeVault(apiKey: string | null = 'test-api-key'): SafeStorageVault {
  return {
    hasValidCredential: vi.fn().mockResolvedValue(apiKey !== null),
    loadCredential: vi.fn().mockResolvedValue(
      apiKey !== null ? { plaintext: apiKey, type: 'api_key' } : null
    ),
    storeCredential: vi.fn().mockResolvedValue(undefined),
    deleteCredential: vi.fn().mockResolvedValue(undefined),
  } as unknown as SafeStorageVault;
}

// ── Fake fetch factory ───────────────────────────────────────────────────────

function makeFetch(
  responses: Array<{ status: number; body: unknown; headers?: Record<string, string> }>
): ReturnType<typeof vi.fn> {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      headers: {
        get: (name: string) => resp.headers?.[name] ?? null,
      },
      json: () => Promise.resolve(resp.body),
      text: () => Promise.resolve(JSON.stringify(resp.body)),
    });
  });
}

// ── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_ENGAGEMENTS = [
  { id: 'e1', title: 'Q1 Review', date: '2026-01-15', participants: ['Alice', 'Bob'] },
  { id: 'e2', title: 'Board Prep', date: '2026-02-20', participants: ['Carol'] },
];

const SAMPLE_SUMMARY = {
  id: 'e1',
  summary: 'Discussed roadmap and hiring.',
  keyTopics: ['roadmap', 'hiring'],
};

beforeEach(() => {
  vi.clearAllMocks();
  // Clear env so tests don't accidentally read a real key
  delete process.env['CHORUS_API_KEY'];
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env['CHORUS_API_KEY'];
});

describe('ChorusClient — isAuthenticated', () => {
  it('returns true when vault has api_key', async () => {
    const client = new ChorusClient(makeVault('my-key'));
    await expect(client.isAuthenticated()).resolves.toBe(true);
  });

  it('returns false when vault returns null and no env key', async () => {
    const client = new ChorusClient(makeVault(null));
    await expect(client.isAuthenticated()).resolves.toBe(false);
  });

  it('returns true when CHORUS_API_KEY env var set and vault empty', async () => {
    process.env['CHORUS_API_KEY'] = 'env-key';
    const client = new ChorusClient(makeVault(null));
    await expect(client.isAuthenticated()).resolves.toBe(true);
  });
});

describe('ChorusClient — healthCheck', () => {
  it('returns ok=true with api_key authMode', async () => {
    const client = new ChorusClient(makeVault());
    const health = await client.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.authMode).toBe('api_key');
  });

  it('returns ok=false when no key', async () => {
    const client = new ChorusClient(makeVault(null));
    const health = await client.healthCheck();
    expect(health.ok).toBe(false);
  });
});

describe('ChorusClient — reconnect', () => {
  it('stores env key via vault when CHORUS_API_KEY set', async () => {
    process.env['CHORUS_API_KEY'] = 'new-key';
    const vault = makeVault(null);
    const client = new ChorusClient(vault);
    await client.reconnect();
    expect(vault.storeCredential).toHaveBeenCalledWith('chorus', 'new-key', 'api_key');
  });

  it('throws ChorusAPIKeyMissingError when no env key', async () => {
    const client = new ChorusClient(makeVault(null));
    await expect(client.reconnect()).rejects.toBeInstanceOf(ChorusAPIKeyMissingError);
  });
});

describe('ChorusClient — listEngagements (B11 cap)', () => {
  it('stamps sourceConfidenceCap: 69 on every engagement', async () => {
    vi.stubGlobal('fetch', makeFetch([{ status: 200, body: SAMPLE_ENGAGEMENTS }]));
    const client = new ChorusClient(makeVault());
    const results = await client.listEngagements({ since: new Date('2026-01-01') });

    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.sourceConfidenceCap).toBe(CHORUS_CONFIDENCE_CAP);
      expect(r.source_type).toBe('chorus');
    }
  });

  it('throws ChorusAPIKeyMissingError when no key', async () => {
    const client = new ChorusClient(makeVault(null));
    await expect(client.listEngagements({ since: new Date() })).rejects.toBeInstanceOf(
      ChorusAPIKeyMissingError
    );
  });
});

describe('ChorusClient — getEngagementSummary (B11 cap)', () => {
  it('stamps sourceConfidenceCap: 69 on summary', async () => {
    vi.stubGlobal('fetch', makeFetch([{ status: 200, body: SAMPLE_SUMMARY }]));
    const client = new ChorusClient(makeVault());
    const result = await client.getEngagementSummary('e1');
    expect(result.sourceConfidenceCap).toBe(CHORUS_CONFIDENCE_CAP);
    expect(result.source_type).toBe('chorus');
    expect(result.summary).toBe('Discussed roadmap and hiring.');
  });
});

describe('ChorusClient — searchCallsByParticipant (B11 cap)', () => {
  it('stamps sourceConfidenceCap: 69 on every result', async () => {
    vi.stubGlobal('fetch', makeFetch([{ status: 200, body: SAMPLE_ENGAGEMENTS }]));
    const client = new ChorusClient(makeVault());
    const results = await client.searchCallsByParticipant({ name: 'Alice' });
    for (const r of results) {
      expect(r.sourceConfidenceCap).toBe(CHORUS_CONFIDENCE_CAP);
      expect(r.source_type).toBe('chorus');
    }
  });
});

describe('ChorusClient — error paths', () => {
  it('throws ChorusAuthExpiredError on 401', async () => {
    vi.stubGlobal('fetch', makeFetch([{ status: 401, body: { error: 'Unauthorized' } }]));
    const client = new ChorusClient(makeVault());
    await expect(client.listEngagements({ since: new Date() })).rejects.toBeInstanceOf(
      ChorusAuthExpiredError
    );
  });

  it('throws ChorusAuthExpiredError on 403', async () => {
    vi.stubGlobal('fetch', makeFetch([{ status: 403, body: { error: 'Forbidden' } }]));
    const client = new ChorusClient(makeVault());
    await expect(client.listEngagements({ since: new Date() })).rejects.toBeInstanceOf(
      ChorusAuthExpiredError
    );
  });

  it('throws ChorusRateLimitedError on 429 with Retry-After header', async () => {
    vi.stubGlobal('fetch', makeFetch([
      { status: 429, body: {}, headers: { 'Retry-After': '60' } },
    ]));
    const client = new ChorusClient(makeVault());
    await expect(client.listEngagements({ since: new Date() })).rejects.toBeInstanceOf(
      ChorusRateLimitedError
    );
  });

  it('retryAfterSeconds is parsed from header', async () => {
    vi.stubGlobal('fetch', makeFetch([
      { status: 429, body: {}, headers: { 'Retry-After': '30' } },
    ]));
    const client = new ChorusClient(makeVault());
    let err: ChorusRateLimitedError | undefined;
    try {
      await client.listEngagements({ since: new Date() });
    } catch (e) {
      if (e instanceof ChorusRateLimitedError) err = e;
    }
    expect(err?.retryAfterSeconds).toBe(30);
  });
});

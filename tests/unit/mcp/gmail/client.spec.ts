// tests/unit/mcp/gmail/client.spec.ts
// Tests for GmailClient: isAuthenticated, healthCheck, searchThreads happy path,
// getThread, getMessage, 401 auto-refresh, 401 revoke, 404, 429, no-cred, timeout.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GmailClient } from '../../../../apps/utility/src/mcp/gmail/client.js';
import {
  GmailAuthExpiredError,
  GmailAuthRevokedError,
  GmailNetworkError,
  GmailThreadNotFoundError,
  GmailRateLimitedError,
} from '../../../../apps/utility/src/mcp/gmail/errors.js';
import type { SafeStorageVault } from '../../../../apps/utility/src/credentials/safeStorageVault.js';

// Set OAuth App env vars so refreshAccessToken doesn't throw GmailOAuthAppMissingError.
const ORIGINAL_ENV = { ...process.env };
beforeEach(() => {
  process.env['GMAIL_CLIENT_ID'] = 'test-client-id';
  process.env['GMAIL_CLIENT_SECRET'] = 'test-client-secret';
});
afterEach(() => {
  process.env['GMAIL_CLIENT_ID'] = ORIGINAL_ENV['GMAIL_CLIENT_ID'];
  process.env['GMAIL_CLIENT_SECRET'] = ORIGINAL_ENV['GMAIL_CLIENT_SECRET'];
  vi.unstubAllGlobals();
});

// ── Fake vault helper ────────────────────────────────────────────────────────

function makeVault(opts: {
  hasCredential?: boolean;
  plaintext?: string;
} = {}): SafeStorageVault {
  return {
    hasValidCredential: vi.fn().mockResolvedValue(opts.hasCredential ?? true),
    loadCredential: vi.fn().mockResolvedValue(
      opts.hasCredential !== false
        ? {
            plaintext: opts.plaintext ?? 'fake-refresh-token',
            type: 'oauth_refresh_token' as const,
            metadata: { scope: 'https://www.googleapis.com/auth/gmail.readonly' },
          }
        : null
    ),
    storeCredential: vi.fn().mockResolvedValue(undefined),
    deleteCredential: vi.fn().mockResolvedValue(undefined),
  } as unknown as SafeStorageVault;
}

// ── Fake fetch factory ───────────────────────────────────────────────────────

function makeFetch(
  responses: Array<{ status: number; body: unknown }>
): ReturnType<typeof vi.fn> {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: () => Promise.resolve(resp.body),
      text: () => Promise.resolve(JSON.stringify(resp.body)),
    });
  });
}

// ── Shared fixture data ──────────────────────────────────────────────────────

const TOKEN_REFRESH_RESPONSE = {
  access_token: 'new-access-token',
  expires_in: 3600,
  token_type: 'Bearer',
};

const THREAD_LIST_RESPONSE = {
  threads: [
    { id: 'thread-1', snippet: 'Hello world' },
    { id: 'thread-2', snippet: 'Follow up on budget' },
  ],
  resultSizeEstimate: 2,
};

const THREAD_RESPONSE = {
  id: 'thread-1',
  messages: [
    {
      id: 'msg-1',
      threadId: 'thread-1',
      payload: {
        headers: [
          { name: 'Subject', value: 'Q3 Board Update' },
          { name: 'From', value: 'ceo@class.com' },
          { name: 'To', value: 'russell@class.com' },
          { name: 'Date', value: 'Wed, 27 May 2026 09:00:00 +0000' },
        ],
      },
      snippet: 'Please review the attached slides.',
    },
  ],
};

const MESSAGE_RESPONSE = {
  id: 'msg-1',
  threadId: 'thread-1',
  payload: {
    headers: [
      { name: 'Subject', value: 'Q3 Board Update' },
      { name: 'From', value: 'ceo@class.com' },
      { name: 'To', value: 'russell@class.com' },
      { name: 'Date', value: 'Wed, 27 May 2026 09:00:00 +0000' },
    ],
  },
  snippet: 'Please review the attached slides.',
};

// ── isAuthenticated ──────────────────────────────────────────────────────────

describe('GmailClient — isAuthenticated', () => {
  it('returns true when vault has a valid credential', async () => {
    const client = new GmailClient(makeVault({ hasCredential: true }));
    await expect(client.isAuthenticated()).resolves.toBe(true);
  });

  it('returns false when vault has no credential', async () => {
    const client = new GmailClient(makeVault({ hasCredential: false }));
    await expect(client.isAuthenticated()).resolves.toBe(false);
  });
});

// ── healthCheck ──────────────────────────────────────────────────────────────

describe('GmailClient — healthCheck', () => {
  it('returns ok=true with oauth authMode when authenticated', async () => {
    const client = new GmailClient(makeVault({ hasCredential: true }));
    const health = await client.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.authMode).toBe('oauth');
  });

  it('returns ok=false when not authenticated', async () => {
    const client = new GmailClient(makeVault({ hasCredential: false }));
    const health = await client.healthCheck();
    expect(health.ok).toBe(false);
  });
});

// ── serviceId ────────────────────────────────────────────────────────────────

describe('GmailClient — serviceId', () => {
  it('returns serviceId = gmail', () => {
    const client = new GmailClient(makeVault());
    expect(client.serviceId).toBe('gmail');
  });
});

// ── searchThreads happy path ─────────────────────────────────────────────────

describe('GmailClient — searchThreads', () => {
  it('returns thread list from Gmail API', async () => {
    const client = new GmailClient(makeVault());
    const stubFetch = makeFetch([
      { status: 200, body: TOKEN_REFRESH_RESPONSE },
      { status: 200, body: THREAD_LIST_RESPONSE },
    ]);
    vi.stubGlobal('fetch', stubFetch);

    const result = await client.searchThreads('from:ceo@class.com');
    expect(result.threads).toHaveLength(2);
    expect(result.resultSizeEstimate).toBe(2);
    expect(result.threads[0]?.id).toBe('thread-1');
  });

  it('passes maxResults as query param when supplied', async () => {
    const client = new GmailClient(makeVault());
    const stubFetch = makeFetch([
      { status: 200, body: TOKEN_REFRESH_RESPONSE },
      { status: 200, body: { threads: [], resultSizeEstimate: 0 } },
    ]);
    vi.stubGlobal('fetch', stubFetch);

    await client.searchThreads('subject:board', { maxResults: 5 });
    const calledUrl = (stubFetch.mock.calls[1] as [string])[0];
    expect(calledUrl).toContain('maxResults=5');
  });

  it('returns empty threads array when Gmail returns no threads key', async () => {
    const client = new GmailClient(makeVault());
    vi.stubGlobal(
      'fetch',
      makeFetch([
        { status: 200, body: TOKEN_REFRESH_RESPONSE },
        { status: 200, body: { resultSizeEstimate: 0 } },
      ])
    );
    const result = await client.searchThreads('subject:nothing');
    expect(result.threads).toEqual([]);
  });
});

// ── getThread ────────────────────────────────────────────────────────────────

describe('GmailClient — getThread', () => {
  it('returns parsed thread with messages', async () => {
    const client = new GmailClient(makeVault());
    vi.stubGlobal(
      'fetch',
      makeFetch([
        { status: 200, body: TOKEN_REFRESH_RESPONSE },
        { status: 200, body: THREAD_RESPONSE },
      ])
    );
    const thread = await client.getThread('thread-1');
    expect(thread.id).toBe('thread-1');
    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0]?.subject).toBe('Q3 Board Update');
    expect(thread.messages[0]?.from).toBe('ceo@class.com');
  });

  it('throws GmailThreadNotFoundError on 404', async () => {
    const client = new GmailClient(makeVault());
    vi.stubGlobal(
      'fetch',
      makeFetch([
        { status: 200, body: TOKEN_REFRESH_RESPONSE },
        { status: 404, body: { error: { code: 404, message: 'Not found' } } },
      ])
    );
    await expect(client.getThread('bad-id')).rejects.toThrow(GmailThreadNotFoundError);
  });
});

// ── getMessage ───────────────────────────────────────────────────────────────

describe('GmailClient — getMessage', () => {
  it('returns parsed message with headers', async () => {
    const client = new GmailClient(makeVault());
    vi.stubGlobal(
      'fetch',
      makeFetch([
        { status: 200, body: TOKEN_REFRESH_RESPONSE },
        { status: 200, body: MESSAGE_RESPONSE },
      ])
    );
    const msg = await client.getMessage('msg-1');
    expect(msg.id).toBe('msg-1');
    expect(msg.threadId).toBe('thread-1');
    expect(msg.subject).toBe('Q3 Board Update');
    expect(msg.snippet).toBe('Please review the attached slides.');
  });
});

// ── 401 auto-refresh ─────────────────────────────────────────────────────────

describe('GmailClient — 401 auto-refresh', () => {
  it('retries after a successful token refresh on 401', async () => {
    const client = new GmailClient(makeVault());
    const stubFetch = makeFetch([
      { status: 200, body: TOKEN_REFRESH_RESPONSE }, // initial token fetch
      { status: 401, body: { error: 'invalid_token' } },
      { status: 200, body: TOKEN_REFRESH_RESPONSE }, // retry token fetch
      { status: 200, body: THREAD_LIST_RESPONSE },   // retry query
    ]);
    vi.stubGlobal('fetch', stubFetch);

    const result = await client.searchThreads('from:ceo@class.com');
    expect(result.threads).toHaveLength(2);
  });

  it('throws GmailAuthRevokedError on second 401 (token permanently invalid)', async () => {
    const client = new GmailClient(makeVault());
    const stubFetch = makeFetch([
      { status: 200, body: TOKEN_REFRESH_RESPONSE },
      { status: 401, body: {} },
      { status: 200, body: TOKEN_REFRESH_RESPONSE },
      { status: 401, body: {} }, // second 401 — auth revoked
    ]);
    vi.stubGlobal('fetch', stubFetch);

    await expect(client.searchThreads('from:ceo@class.com')).rejects.toThrow(
      GmailAuthRevokedError
    );
  });
});

// ── no credential ────────────────────────────────────────────────────────────

describe('GmailClient — no credential', () => {
  it('throws GmailAuthExpiredError when vault has no credential', async () => {
    const vault = makeVault({ hasCredential: false });
    const client = new GmailClient(vault);
    vi.stubGlobal('fetch', vi.fn());

    await expect(client.searchThreads('from:anyone')).rejects.toThrow(GmailAuthExpiredError);
  });
});

// ── network / rate-limit errors ──────────────────────────────────────────────

describe('GmailClient — error handling', () => {
  it('throws GmailRateLimitedError on 429', async () => {
    const client = new GmailClient(makeVault());
    vi.stubGlobal(
      'fetch',
      makeFetch([
        { status: 200, body: TOKEN_REFRESH_RESPONSE },
        { status: 429, body: {} },
      ])
    );
    await expect(client.searchThreads('from:ceo@class.com')).rejects.toThrow(
      GmailRateLimitedError
    );
  });

  it('throws GmailNetworkError on AbortError (timeout)', async () => {
    const client = new GmailClient(makeVault());
    const stubFetch = vi.fn().mockImplementation(() => {
      const err = new Error('The operation was aborted.');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    vi.stubGlobal('fetch', stubFetch);

    await expect(client.searchThreads('from:ceo@class.com')).rejects.toThrow(GmailNetworkError);
  });
});

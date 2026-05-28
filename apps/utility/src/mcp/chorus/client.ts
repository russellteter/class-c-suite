// apps/utility/src/mcp/chorus/client.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §8
//
// ChorusClient — implements McpClient using Chorus API key auth.
// API key: Russell pastes once → stored via safeStorage (credential_type: 'api_key').
// Fallback: reads CHORUS_API_KEY env var for local dev / smoke tests.
//
// CRITICAL (B11): Every result is tagged with source_type: 'chorus'
// and sourceConfidenceCap: 69. The withConfidenceCap() helper is called
// on every result — never skip.

import type {
  ChorusClient as IChorusClient,
  ChorusEngagement,
  ChorusSummary,
  McpHealth,
} from '@c-suite/shared-types/mcp';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import { withConfidenceCap } from './confidence-cap.js';
import {
  ChorusAPIKeyMissingError,
  ChorusAuthExpiredError,
  ChorusRateLimitedError,
} from './errors.js';

const CHORUS_BASE_URL = 'https://chorus.ai/api/v1';
const REQUEST_TIMEOUT_MS = 30_000;

// ── Raw API shapes (before tagging) ─────────────────────────────────────────

interface RawChorusEngagement {
  id: string;
  title: string;
  date: string;
  participants: string[];
}

interface RawChorusSummary {
  id: string;
  summary: string;
  keyTopics: string[];
}

export class ChorusClient implements IChorusClient {
  readonly serviceId = 'chorus' as const;

  private apiKey: string | null = null;
  private lastSuccessAt: Date | undefined;
  private lastError: string | undefined;

  constructor(private readonly vault: SafeStorageVault) {}

  // ── McpClient contract ──────────────────────────────────────────────────────

  async isAuthenticated(): Promise<boolean> {
    const key = await this.resolveApiKey();
    return key !== null;
  }

  async reconnect(): Promise<void> {
    // Reads CHORUS_API_KEY from env and stores via vault.
    const envKey = process.env['CHORUS_API_KEY'];
    if (!envKey) {
      throw new ChorusAPIKeyMissingError();
    }
    await this.vault.storeCredential('chorus', envKey, 'api_key');
    this.apiKey = envKey;
  }

  async healthCheck(): Promise<McpHealth> {
    const ok = await this.isAuthenticated();
    return {
      ok,
      lastSuccessAt: this.lastSuccessAt,
      lastError: this.lastError,
      authMode: 'api_key',
    };
  }

  // ── Chorus API methods — all results tagged via withConfidenceCap() ─────────

  async listEngagements(args: { since: Date }): Promise<ChorusEngagement[]> {
    const apiKey = await this.requireApiKey();
    const sinceIso = args.since.toISOString();
    const raw = await this.apiFetch<RawChorusEngagement[]>(
      `/engagements?since=${encodeURIComponent(sinceIso)}`,
      apiKey
    );
    this.lastSuccessAt = new Date();
    return raw.map(e => withConfidenceCap(e));
  }

  async getEngagementSummary(id: string): Promise<ChorusSummary> {
    const apiKey = await this.requireApiKey();
    const raw = await this.apiFetch<RawChorusSummary>(
      `/engagements/${encodeURIComponent(id)}/summary`,
      apiKey
    );
    this.lastSuccessAt = new Date();
    return withConfidenceCap(raw);
  }

  async searchCallsByParticipant(args: { name: string }): Promise<ChorusEngagement[]> {
    const apiKey = await this.requireApiKey();
    const raw = await this.apiFetch<RawChorusEngagement[]>(
      `/engagements/search?participant=${encodeURIComponent(args.name)}`,
      apiKey
    );
    this.lastSuccessAt = new Date();
    return raw.map(e => withConfidenceCap(e));
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  private async apiFetch<T>(path: string, apiKey: string): Promise<T> {
    const url = `${CHORUS_BASE_URL}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      this.lastError = String(err);
      throw err;
    }
    clearTimeout(timer);

    if (response.status === 401 || response.status === 403) {
      this.lastError = `Auth rejected (${response.status})`;
      this.apiKey = null; // invalidate cached key
      throw new ChorusAuthExpiredError();
    }

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') ?? '0', 10) || undefined;
      this.lastError = 'Rate limited';
      throw new ChorusRateLimitedError(retryAfter);
    }

    if (!response.ok) {
      const text = await response.text();
      this.lastError = `HTTP ${response.status}`;
      throw new Error(`Chorus API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  private async resolveApiKey(): Promise<string | null> {
    if (this.apiKey) return this.apiKey;

    // 1. Try vault
    const cred = await this.vault.loadCredential('chorus');
    if (cred) {
      this.apiKey = cred.plaintext;
      return this.apiKey;
    }

    // 2. Fallback: CHORUS_API_KEY env var (local dev / smoke tests)
    const envKey = process.env['CHORUS_API_KEY'];
    if (envKey) {
      this.apiKey = envKey;
      return this.apiKey;
    }

    return null;
  }

  private async requireApiKey(): Promise<string> {
    const key = await this.resolveApiKey();
    if (!key) throw new ChorusAPIKeyMissingError();
    return key;
  }
}

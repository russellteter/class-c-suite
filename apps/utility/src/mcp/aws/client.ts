// apps/utility/src/mcp/aws/client.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §6
//
// AWSClient — implements McpClient using local SSO profiles.
// Auth reads from ~/.aws/credentials + ~/.aws/config via the credential-providers SDK.
//
// CRITICAL RULE (R1-verified): Always sum 'class' + 'collab' profiles.
// If only one profile is present/reachable, return result + degraded_sources flag.
// Never serve data from a single profile without the degrade flag.

import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  type GetCostAndUsageCommandInput,
  type ResultByTime,
} from '@aws-sdk/client-cost-explorer';
import {
  OrganizationsClient,
  ListAccountsCommand,
  type Account,
} from '@aws-sdk/client-organizations';
import { fromSSO } from '@aws-sdk/credential-providers';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type {
  AwsClient as IAwsClient,
  McpHealth,
} from '@c-suite/shared-types/mcp';
import {
  AWSProfileNotFoundError,
  AWSSSOExpiredError,
  AWSCostExplorerError,
} from './errors.js';

// The two profiles that must always be summed (R1-verified rule).
const CLASS_PROFILE = 'class' as const;
const COLLAB_PROFILE = 'collab' as const;
const ALL_PROFILES = [CLASS_PROFILE, COLLAB_PROFILE] as const;

export type AWSProfile = typeof CLASS_PROFILE | typeof COLLAB_PROFILE;
export type DegradedSource = 'aws-class' | 'aws-collab';

export interface AWSCostResult {
  total: number;
  byProfile: Record<AWSProfile, number | null>;
  currency: string;
  resultsByTime: ResultByTime[];
  /** Present when one profile is unreachable — consumers must display a degrade warning. */
  degraded_sources?: DegradedSource[];
}

export interface AWSOrganizationResult {
  accounts: Account[];
  byProfile: Record<AWSProfile, Account[]>;
  /** Present when one profile is unreachable. */
  degraded_sources?: DegradedSource[];
}

export class AWSClient implements IAwsClient {
  readonly serviceId = 'aws' as const;

  private lastSuccessAt: Date | undefined;
  private lastError: string | undefined;

  // ── McpClient contract ──────────────────────────────────────────────────────

  async isAuthenticated(): Promise<boolean> {
    // Check that both profiles exist in ~/.aws/config.
    const profiles = await this.readConfigProfiles();
    return ALL_PROFILES.every(p => profiles.has(p));
  }

  async reconnect(): Promise<void> {
    // AWS SSO cannot be relaunched programmatically — instruct the user.
    // Check which profiles are expired and throw with remediation.
    const expired: string[] = [];
    for (const profile of ALL_PROFILES) {
      const ok = await this.probeProfile(profile);
      if (!ok) expired.push(profile);
    }
    if (expired.length > 0) {
      const cmds = expired.map(p => `aws sso login --profile ${p}`).join(' && ');
      throw new AWSSSOExpiredError(expired.join(', ') + `. Run: ${cmds}`);
    }
  }

  async healthCheck(): Promise<McpHealth> {
    const ok = await this.isAuthenticated();
    return {
      ok,
      lastSuccessAt: this.lastSuccessAt,
      lastError: this.lastError,
      authMode: 'sso',
    };
  }

  // ── Core query methods ───────────────────────────────────────────────────────

  /**
   * getCostExplorer for a single profile (McpClient contract surface).
   * Consumers should use typed-queries.ts totalSpendQuery() for the summed view.
   */
  async getCostExplorer(args: {
    profile: string;
    start: string;
    end: string;
  }): Promise<unknown> {
    return this.fetchCostForProfile(args.profile, args.start, args.end);
  }

  /**
   * getOrganizationAccounts for a single profile (McpClient contract surface).
   * Consumers should use typed-queries.ts combinedOrganizationAccounts() for summed view.
   */
  async getOrganizationAccounts(args: { profile: string }): Promise<unknown> {
    return this.fetchOrganizationAccountsForProfile(args.profile);
  }

  // ── Summed methods (class + collab) ─────────────────────────────────────────

  /**
   * Fetch and SUM cost data across class + collab profiles.
   * If one profile fails, returns data from the other + degraded_sources flag.
   */
  async getCombinedCost(args: { start: string; end: string }): Promise<AWSCostResult> {
    const results = await this.fetchBothProfiles(
      p => this.fetchCostForProfile(p, args.start, args.end)
    );
    return this._aggregateCost(results);
  }

  /**
   * Aggregate per-profile cost results into a combined AWSCostResult.
   * Exposed as protected for unit testing without real AWS SDK calls.
   */
  _aggregateCost(
    results: Record<AWSProfile, { ok: true; value: unknown } | { ok: false; error: unknown }>
  ): AWSCostResult {
    let total = 0;
    const byProfile: Record<AWSProfile, number | null> = {
      class: null,
      collab: null,
    };
    let allResultsByTime: ResultByTime[] = [];
    let currency = 'USD';
    const degraded: DegradedSource[] = [];

    for (const profile of ALL_PROFILES) {
      const res = results[profile];
      if (res.ok) {
        const data = res.value as { total: number; resultsByTime: ResultByTime[]; currency: string };
        byProfile[profile] = data.total;
        total += data.total;
        allResultsByTime = [...allResultsByTime, ...data.resultsByTime];
        currency = data.currency;
      } else {
        byProfile[profile] = null;
        degraded.push(`aws-${profile}` as DegradedSource);
      }
    }

    if (degraded.length === ALL_PROFILES.length) {
      throw new AWSCostExplorerError(
        'Both AWS profiles failed. Run: aws sso login --profile class && aws sso login --profile collab'
      );
    }

    this.lastSuccessAt = new Date();
    this.lastError = undefined;

    return {
      total,
      byProfile,
      currency,
      resultsByTime: allResultsByTime,
      ...(degraded.length > 0 ? { degraded_sources: degraded } : {}),
    };
  }

  /**
   * Fetch and MERGE organization accounts across class + collab profiles.
   */
  async getCombinedOrganizationAccounts(): Promise<AWSOrganizationResult> {
    const results = await this.fetchBothProfiles(
      p => this.fetchOrganizationAccountsForProfile(p)
    );

    const byProfile: Record<AWSProfile, Account[]> = { class: [], collab: [] };
    const degraded: DegradedSource[] = [];

    for (const profile of ALL_PROFILES) {
      const res = results[profile];
      if (res.ok) {
        byProfile[profile] = res.value as Account[];
      } else {
        degraded.push(`aws-${profile}` as DegradedSource);
      }
    }

    if (degraded.length === ALL_PROFILES.length) {
      throw new AWSCostExplorerError('Both AWS profiles failed for org accounts.');
    }

    const allAccounts = [...byProfile.class, ...byProfile.collab];
    this.lastSuccessAt = new Date();

    return {
      accounts: allAccounts,
      byProfile,
      ...(degraded.length > 0 ? { degraded_sources: degraded } : {}),
    };
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  private async fetchCostForProfile(
    profile: string,
    start: string,
    end: string
  ): Promise<{ total: number; resultsByTime: ResultByTime[]; currency: string }> {
    await this.assertProfileAccessible(profile);

    const credentials = fromSSO({ profile });
    const client = new CostExplorerClient({
      region: 'us-east-1', // Cost Explorer is global; us-east-1 is the canonical endpoint.
      credentials,
    });

    const input: GetCostAndUsageCommandInput = {
      TimePeriod: { Start: start, End: end },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
    };

    let response;
    try {
      response = await client.send(new GetCostAndUsageCommand(input));
    } catch (err: unknown) {
      this.lastError = String(err);
      if (this.isSSOExpiredError(err)) {
        throw new AWSSSOExpiredError(profile);
      }
      throw new AWSCostExplorerError(`Cost Explorer error for profile '${profile}': ${String(err)}`, err);
    }

    const resultsByTime = response.ResultsByTime ?? [];
    let total = 0;
    let currency = 'USD';

    for (const period of resultsByTime) {
      const amount = parseFloat(period.Total?.UnblendedCost?.Amount ?? '0');
      currency = period.Total?.UnblendedCost?.Unit ?? 'USD';
      total += amount;
    }

    return { total, resultsByTime, currency };
  }

  private async fetchOrganizationAccountsForProfile(profile: string): Promise<Account[]> {
    await this.assertProfileAccessible(profile);

    const credentials = fromSSO({ profile });
    const client = new OrganizationsClient({
      region: 'us-east-1',
      credentials,
    });

    const accounts: Account[] = [];
    let nextToken: string | undefined;

    do {
      let response;
      try {
        response = await client.send(new ListAccountsCommand({ NextToken: nextToken }));
      } catch (err: unknown) {
        this.lastError = String(err);
        if (this.isSSOExpiredError(err)) {
          throw new AWSSSOExpiredError(profile);
        }
        throw new AWSCostExplorerError(`Organizations error for profile '${profile}': ${String(err)}`, err);
      }
      accounts.push(...(response.Accounts ?? []));
      nextToken = response.NextToken;
    } while (nextToken);

    return accounts;
  }

  /**
   * Run a fetch for both profiles in parallel; capture ok/error per profile.
   */
  private async fetchBothProfiles<T>(
    fn: (profile: AWSProfile) => Promise<T>
  ): Promise<Record<AWSProfile, { ok: true; value: T } | { ok: false; error: unknown }>> {
    const [classResult, collabResult] = await Promise.allSettled([
      fn(CLASS_PROFILE),
      fn(COLLAB_PROFILE),
    ]);

    return {
      class: classResult.status === 'fulfilled'
        ? { ok: true, value: classResult.value }
        : { ok: false, error: classResult.reason },
      collab: collabResult.status === 'fulfilled'
        ? { ok: true, value: collabResult.value }
        : { ok: false, error: collabResult.reason },
    };
  }

  private async assertProfileAccessible(profile: string): Promise<void> {
    const profiles = await this.readConfigProfiles();
    if (!profiles.has(profile)) {
      throw new AWSProfileNotFoundError(profile);
    }
  }

  private async probeProfile(profile: AWSProfile): Promise<boolean> {
    const profiles = await this.readConfigProfiles();
    return profiles.has(profile);
  }

  /**
   * Parse ~/.aws/config for section headers like [profile class] or [class].
   * Returns a Set of profile names.
   */
  private async readConfigProfiles(): Promise<Set<string>> {
    const configPath = join(homedir(), '.aws', 'config');
    let content: string;
    try {
      content = await readFile(configPath, 'utf8');
    } catch {
      return new Set();
    }

    const profiles = new Set<string>();
    const sectionPattern = /^\[(profile\s+)?([^\]]+)\]/gm;
    let match;
    while ((match = sectionPattern.exec(content)) !== null) {
      const name = match[2]?.trim();
      if (name && name !== 'default') {
        profiles.add(name);
      }
    }
    return profiles;
  }

  private isSSOExpiredError(err: unknown): boolean {
    const msg = String(err);
    return (
      msg.includes('Token has expired') ||
      msg.includes('SSO') ||
      msg.includes('EXPIRED') ||
      msg.includes('not authorized')
    );
  }
}

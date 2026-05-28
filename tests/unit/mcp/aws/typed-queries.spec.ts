// tests/unit/mcp/aws/typed-queries.spec.ts
import { describe, it, expect, vi } from 'vitest';
import {
  totalSpendQuery,
  monthlySpendQuery,
  yearToDateSpendQuery,
  combinedOrganizationAccounts,
} from '../../../../apps/utility/src/mcp/aws/typed-queries.js';
import type { AWSClient } from '../../../../apps/utility/src/mcp/aws/client.js';

function makeClient(overrides: Partial<AWSClient> = {}): AWSClient {
  return {
    serviceId: 'aws',
    getCombinedCost: vi.fn().mockResolvedValue({
      total: 500,
      byProfile: { class: 300, collab: 200 },
      currency: 'USD',
      resultsByTime: [],
    }),
    getCombinedOrganizationAccounts: vi.fn().mockResolvedValue({
      accounts: [{ Id: 'a1', Name: 'Acct1' }],
      byProfile: { class: [{ Id: 'a1', Name: 'Acct1' }], collab: [] },
    }),
    getCostExplorer: vi.fn(),
    getOrganizationAccounts: vi.fn(),
    isAuthenticated: vi.fn().mockResolvedValue(true),
    reconnect: vi.fn(),
    healthCheck: vi.fn(),
    ...overrides,
  } as unknown as AWSClient;
}

describe('totalSpendQuery', () => {
  it('calls getCombinedCost with provided dates', async () => {
    const client = makeClient();
    const result = await totalSpendQuery(client, { start: '2026-01-01', end: '2026-01-31' });
    expect(client.getCombinedCost).toHaveBeenCalledWith({ start: '2026-01-01', end: '2026-01-31' });
    expect(result.total).toBe(500);
  });

  it('defaults to 3-months-ago to today when no args given', async () => {
    const client = makeClient();
    await totalSpendQuery(client);
    const args = (client.getCombinedCost as ReturnType<typeof vi.fn>).mock.calls[0][0] as { start: string; end: string };
    expect(args.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(args.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('result carries both profile values', async () => {
    const client = makeClient();
    const result = await totalSpendQuery(client);
    expect(result.byProfile.class).toBe(300);
    expect(result.byProfile.collab).toBe(200);
  });
});

describe('monthlySpendQuery', () => {
  it('calls getCombinedCost starting on the 1st of current month', async () => {
    const client = makeClient();
    await monthlySpendQuery(client);
    const args = (client.getCombinedCost as ReturnType<typeof vi.fn>).mock.calls[0][0] as { start: string; end: string };
    expect(args.start).toMatch(/-01$/);
  });
});

describe('yearToDateSpendQuery', () => {
  it('calls getCombinedCost starting Jan 1 of current year', async () => {
    const client = makeClient();
    await yearToDateSpendQuery(client);
    const args = (client.getCombinedCost as ReturnType<typeof vi.fn>).mock.calls[0][0] as { start: string; end: string };
    const year = new Date().getFullYear();
    expect(args.start).toBe(`${year}-01-01`);
  });
});

describe('combinedOrganizationAccounts', () => {
  it('returns merged accounts from both profiles', async () => {
    const client = makeClient();
    const result = await combinedOrganizationAccounts(client);
    expect(result.accounts).toHaveLength(1);
    expect(client.getCombinedOrganizationAccounts).toHaveBeenCalledOnce();
  });
});

describe('cost-explorer-mock (degraded path)', () => {
  it('propagates degraded_sources when present', async () => {
    const client = makeClient({
      getCombinedCost: vi.fn().mockResolvedValue({
        total: 300,
        byProfile: { class: 300, collab: null },
        currency: 'USD',
        resultsByTime: [],
        degraded_sources: ['aws-collab'],
      }),
    });
    const result = await totalSpendQuery(client, { start: '2026-01-01', end: '2026-01-31' });
    expect(result.degraded_sources).toContain('aws-collab');
    expect(result.byProfile.collab).toBeNull();
  });
});

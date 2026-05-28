// tests/unit/mcp/chorus/typed-queries.spec.ts
import { describe, it, expect, vi } from 'vitest';
import {
  recentCallsForStakeholderQuery,
  callsByAccountIdQuery,
} from '../../../../apps/utility/src/mcp/chorus/typed-queries.js';
import { CHORUS_CONFIDENCE_CAP } from '../../../../apps/utility/src/mcp/chorus/confidence-cap.js';
import type { ChorusClient } from '../../../../apps/utility/src/mcp/chorus/client.js';
import type { ChorusEngagement } from '@c-suite/shared-types/mcp';

function taggedEngagement(overrides: Partial<ChorusEngagement> = {}): ChorusEngagement {
  return {
    id: 'e1',
    title: 'Test Call',
    date: '2026-03-15',
    participants: ['Alice'],
    sourceConfidenceCap: 69,
    source_type: 'chorus',
    ...overrides,
  };
}

function makeClient(engagements: ChorusEngagement[]): ChorusClient {
  return {
    serviceId: 'chorus',
    searchCallsByParticipant: vi.fn().mockResolvedValue(engagements),
    listEngagements: vi.fn().mockResolvedValue(engagements),
    getEngagementSummary: vi.fn(),
    isAuthenticated: vi.fn().mockResolvedValue(true),
    reconnect: vi.fn(),
    healthCheck: vi.fn(),
  } as unknown as ChorusClient;
}

describe('recentCallsForStakeholderQuery', () => {
  it('calls searchCallsByParticipant with the stakeholder name', async () => {
    const engagements = [taggedEngagement()];
    const client = makeClient(engagements);
    await recentCallsForStakeholderQuery(client, {
      stakeholder: 'Alice',
      since: new Date('2026-01-01'),
    });
    expect(client.searchCallsByParticipant).toHaveBeenCalledWith({ name: 'Alice' });
  });

  it('filters results before the since date', async () => {
    const client = makeClient([
      taggedEngagement({ id: 'e1', date: '2026-03-15' }),
      taggedEngagement({ id: 'e2', date: '2025-12-01' }),
    ]);
    const results = await recentCallsForStakeholderQuery(client, {
      stakeholder: 'Alice',
      since: new Date('2026-01-01'),
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('e1');
  });

  it('all returned results carry sourceConfidenceCap: 69', async () => {
    const client = makeClient([
      taggedEngagement({ id: 'e1' }),
      taggedEngagement({ id: 'e2' }),
    ]);
    const results = await recentCallsForStakeholderQuery(client, {
      stakeholder: 'Alice',
      since: new Date('2026-01-01'),
    });
    for (const r of results) {
      expect(r.sourceConfidenceCap).toBe(CHORUS_CONFIDENCE_CAP);
    }
  });
});

describe('callsByAccountIdQuery', () => {
  it('calls searchCallsByParticipant with the account ID', async () => {
    const client = makeClient([taggedEngagement()]);
    await callsByAccountIdQuery(client, {
      accountId: 'acct-123',
      since: new Date('2026-01-01'),
    });
    expect(client.searchCallsByParticipant).toHaveBeenCalledWith({ name: 'acct-123' });
  });

  it('filters out results before since date', async () => {
    const client = makeClient([
      taggedEngagement({ id: 'old', date: '2025-06-01' }),
      taggedEngagement({ id: 'new', date: '2026-04-01' }),
    ]);
    const results = await callsByAccountIdQuery(client, {
      accountId: 'acct-456',
      since: new Date('2026-01-01'),
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('new');
  });

  it('all returned results carry sourceConfidenceCap: 69', async () => {
    const client = makeClient([taggedEngagement()]);
    const results = await callsByAccountIdQuery(client, {
      accountId: 'acct-789',
      since: new Date('2026-01-01'),
    });
    for (const r of results) {
      expect(r.sourceConfidenceCap).toBe(CHORUS_CONFIDENCE_CAP);
    }
  });
});

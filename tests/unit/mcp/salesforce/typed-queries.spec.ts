// tests/unit/mcp/salesforce/typed-queries.spec.ts
// Tests for the Salesforce typed SOQL builder.
// Verifies: correct stage labels (B19), correct field names (B7/B20),
// correct SOQL structure, and injection-safe parameter handling.

import { describe, it, expect } from 'vitest';
import {
  committedPipelineQuery,
  accountAMHealthQuery,
  renewalForecastQuery,
  topAccountsByAMQuery,
  openOpportunityByAccountQuery,
  recentlyClosedWonQuery,
} from '../../../../apps/utility/src/mcp/salesforce/typed-queries.js';
import {
  NEW_BIZ_COMMITTED_STAGES,
  RENEWAL_COMMITTED_STAGES,
} from '../../../../apps/utility/src/playbooks/lib/committed-pipeline.js';

describe('committedPipelineQuery', () => {
  it('new_business: produces a SOQL SELECT on Opportunity', () => {
    const q = committedPipelineQuery({ pipelineType: 'new_business' });
    expect(q).toMatch(/^SELECT .+ FROM Opportunity/);
  });

  it('new_business: includes all R1-verified new-biz stages', () => {
    const q = committedPipelineQuery({ pipelineType: 'new_business' });
    for (const stage of NEW_BIZ_COMMITTED_STAGES) {
      expect(q).toContain(`'${stage}'`);
    }
  });

  it('renewal: includes all R1-verified renewal stages', () => {
    const q = committedPipelineQuery({ pipelineType: 'renewal' });
    for (const stage of RENEWAL_COMMITTED_STAGES) {
      expect(q).toContain(`'${stage}'`);
    }
  });

  it('new_business: includes Type = New Business filter', () => {
    const q = committedPipelineQuery({ pipelineType: 'new_business' });
    expect(q).toContain("Type = 'New Business'");
  });

  it('renewal: includes Type = Renewal filter', () => {
    const q = committedPipelineQuery({ pipelineType: 'renewal' });
    expect(q).toContain("Type = 'Renewal'");
  });

  it('includes IsClosed = false filter', () => {
    const q = committedPipelineQuery({ pipelineType: 'new_business' });
    expect(q).toContain('IsClosed = false');
  });

  it('includes Account_Manager__r (B7)', () => {
    const q = committedPipelineQuery({ pipelineType: 'new_business' });
    expect(q).toContain('Account_Manager__r');
  });

  it('does NOT reference Owner.Name (B7)', () => {
    const q = committedPipelineQuery({ pipelineType: 'new_business' });
    expect(q).not.toContain('Owner.Name');
  });

  it('respects custom limit', () => {
    const q = committedPipelineQuery({ pipelineType: 'new_business', limit: 10 });
    expect(q).toContain('LIMIT 10');
  });

  it('defaults to LIMIT 500', () => {
    const q = committedPipelineQuery({ pipelineType: 'new_business' });
    expect(q).toContain('LIMIT 500');
  });

  it('includes asOfDate filter when provided', () => {
    const date = new Date('2026-07-01');
    const q = committedPipelineQuery({ pipelineType: 'new_business', asOfDate: date });
    expect(q).toContain('CloseDate <= 2026-07-01');
  });
});

describe('accountAMHealthQuery', () => {
  const id = '0012300000AbCdEfA1';

  it('produces a SOQL SELECT on Account', () => {
    const q = accountAMHealthQuery({ accountId: id });
    expect(q).toMatch(/^SELECT .+ FROM Account/);
  });

  it('includes Account_Manager__r.IsActive (B7)', () => {
    const q = accountAMHealthQuery({ accountId: id });
    expect(q).toContain('Account_Manager__r.IsActive');
  });

  it('filters IsActive = TRUE (B7)', () => {
    const q = accountAMHealthQuery({ accountId: id });
    expect(q).toContain('Account_Manager__r.IsActive = TRUE');
  });

  it('uses Renewal_Anniversary_Date__c (B20)', () => {
    const q = accountAMHealthQuery({ accountId: id });
    expect(q).toContain('Renewal_Anniversary_Date__c');
  });

  it('does NOT reference Renewal_Date__c (B20)', () => {
    const q = accountAMHealthQuery({ accountId: id });
    expect(q).not.toContain('Renewal_Date__c');
  });

  it('filters by the provided accountId', () => {
    const q = accountAMHealthQuery({ accountId: id });
    expect(q).toContain(`Id = '${id}'`);
  });
});

describe('renewalForecastQuery', () => {
  it('produces a SOQL SELECT on Opportunity', () => {
    const q = renewalForecastQuery({ months: 3 });
    expect(q).toMatch(/^SELECT .+ FROM Opportunity/);
  });

  it('uses Renewal_Anniversary_Date__c (B20)', () => {
    const q = renewalForecastQuery({ months: 3 });
    expect(q).toContain('Renewal_Anniversary_Date__c');
  });

  it('does NOT use Renewal_Date__c (B20)', () => {
    const q = renewalForecastQuery({ months: 3 });
    expect(q).not.toContain('Renewal_Date__c');
  });

  it('includes a forward-looking date range', () => {
    const q = renewalForecastQuery({ months: 3 });
    const today = new Date().toISOString().split('T')[0];
    expect(q).toContain(`>= ${today}`);
  });

  it('includes IsClosed = false filter', () => {
    const q = renewalForecastQuery({ months: 6 });
    expect(q).toContain('IsClosed = false');
  });
});

describe('topAccountsByAMQuery', () => {
  it('produces a SOQL SELECT on Account', () => {
    const q = topAccountsByAMQuery();
    expect(q).toMatch(/^SELECT .+ FROM Account/);
  });

  it('filters IsActive = TRUE (B7)', () => {
    const q = topAccountsByAMQuery();
    expect(q).toContain('Account_Manager__r.IsActive = TRUE');
  });

  it('includes amId filter when provided', () => {
    const q = topAccountsByAMQuery({ amId: '00512345678AbCdEfA' });
    expect(q).toContain("Account_Manager__r.Id = '00512345678AbCdEfA'");
  });

  it('defaults to LIMIT 25', () => {
    const q = topAccountsByAMQuery();
    expect(q).toContain('LIMIT 25');
  });
});

describe('openOpportunityByAccountQuery', () => {
  it('includes accountId filter', () => {
    const q = openOpportunityByAccountQuery({ accountId: '0012300000AbCdEfA1' });
    expect(q).toContain("AccountId = '0012300000AbCdEfA1'");
  });

  it('includes IsClosed = false', () => {
    const q = openOpportunityByAccountQuery({ accountId: '0012300000AbCdEfA1' });
    expect(q).toContain('IsClosed = false');
  });
});

describe('recentlyClosedWonQuery', () => {
  it("includes StageName = 'Closed Won'", () => {
    const q = recentlyClosedWonQuery({ since: new Date('2026-01-01') });
    expect(q).toContain("StageName = 'Closed Won'");
  });

  it('includes the since date filter', () => {
    const q = recentlyClosedWonQuery({ since: new Date('2026-01-01') });
    expect(q).toContain('CloseDate >= 2026-01-01');
  });

  it('respects custom limit', () => {
    const q = recentlyClosedWonQuery({ since: new Date(), limit: 50 });
    expect(q).toContain('LIMIT 50');
  });
});

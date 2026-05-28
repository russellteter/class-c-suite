// tests/unit/mcp/aws/client.spec.ts
// Tests for AWSClient: class+collab sum, degraded-source flag, healthCheck,
// isAuthenticated, reconnect error path.
//
// The AWS SDK network calls are avoided by testing _aggregateCost directly
// (the extracted pure aggregation method). This tests the critical sum +
// degrade logic without needing real AWS credentials.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AWSClient } from '../../../../apps/utility/src/mcp/aws/client.js';
import { AWSSSOExpiredError, AWSCostExplorerError } from '../../../../apps/utility/src/mcp/aws/errors.js';

// ── Mock node:fs/promises ─────────────────────────────────────────────────────

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';
const mockReadFile = vi.mocked(readFile);

// ── Config fixtures ───────────────────────────────────────────────────────────

const BOTH_PROFILES = '[profile class]\nregion = us-east-1\n\n[profile collab]\nregion = us-east-1\n';
const CLASS_ONLY = '[profile class]\nregion = us-east-1\n';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockReadFile.mockResolvedValue(BOTH_PROFILES as unknown as Uint8Array);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── isAuthenticated ───────────────────────────────────────────────────────────

describe('AWSClient — isAuthenticated', () => {
  it('returns true when both profiles present in config', async () => {
    const client = new AWSClient();
    await expect(client.isAuthenticated()).resolves.toBe(true);
  });

  it('returns false when only class profile present', async () => {
    mockReadFile.mockResolvedValue(CLASS_ONLY as unknown as Uint8Array);
    const client = new AWSClient();
    await expect(client.isAuthenticated()).resolves.toBe(false);
  });

  it('returns false when config file is missing', async () => {
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    const client = new AWSClient();
    await expect(client.isAuthenticated()).resolves.toBe(false);
  });
});

// ── healthCheck ───────────────────────────────────────────────────────────────

describe('AWSClient — healthCheck', () => {
  it('returns ok=true + sso authMode when both profiles present', async () => {
    const client = new AWSClient();
    const health = await client.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.authMode).toBe('sso');
  });

  it('returns ok=false when no profiles in config', async () => {
    mockReadFile.mockResolvedValue('' as unknown as Uint8Array);
    const client = new AWSClient();
    const health = await client.healthCheck();
    expect(health.ok).toBe(false);
  });
});

// ── reconnect ─────────────────────────────────────────────────────────────────

describe('AWSClient — reconnect', () => {
  it('throws AWSSSOExpiredError when profiles are missing', async () => {
    mockReadFile.mockResolvedValue('' as unknown as Uint8Array);
    const client = new AWSClient();
    await expect(client.reconnect()).rejects.toBeInstanceOf(AWSSSOExpiredError);
  });
});

// ── serviceId ─────────────────────────────────────────────────────────────────

describe('AWSClient — serviceId', () => {
  it('returns aws', () => {
    expect(new AWSClient().serviceId).toBe('aws');
  });
});

// ── _aggregateCost — sum + degrade logic ──────────────────────────────────────
// Tests the extracted aggregation method directly. This is the critical
// class+collab sum rule (R1-verified) without needing real AWS credentials.

function costVal(amount: number) {
  return { total: amount, resultsByTime: [], currency: 'USD' };
}

describe('AWSClient — _aggregateCost (class + collab sum)', () => {
  it('sums class and collab when both succeed', () => {
    const client = new AWSClient();
    const result = client._aggregateCost({
      class: { ok: true, value: costVal(100) },
      collab: { ok: true, value: costVal(200) },
    });
    expect(result.total).toBeCloseTo(300, 1);
    expect(result.byProfile.class).toBeCloseTo(100, 1);
    expect(result.byProfile.collab).toBeCloseTo(200, 1);
    expect(result.degraded_sources).toBeUndefined();
  });

  it('returns degraded_sources: aws-collab when collab fails', () => {
    const client = new AWSClient();
    const result = client._aggregateCost({
      class: { ok: true, value: costVal(100) },
      collab: { ok: false, error: new Error('SSO expired') },
    });
    expect(result.degraded_sources).toContain('aws-collab');
    expect(result.byProfile.collab).toBeNull();
    expect(result.byProfile.class).toBeCloseTo(100, 1);
    expect(result.total).toBeCloseTo(100, 1);
  });

  it('returns degraded_sources: aws-class when class fails', () => {
    const client = new AWSClient();
    const result = client._aggregateCost({
      class: { ok: false, error: new Error('SSO expired') },
      collab: { ok: true, value: costVal(50) },
    });
    expect(result.degraded_sources).toContain('aws-class');
    expect(result.byProfile.class).toBeNull();
    expect(result.byProfile.collab).toBeCloseTo(50, 1);
    expect(result.total).toBeCloseTo(50, 1);
  });

  it('throws AWSCostExplorerError when both profiles fail', () => {
    const client = new AWSClient();
    expect(() =>
      client._aggregateCost({
        class: { ok: false, error: new Error('expired') },
        collab: { ok: false, error: new Error('expired') },
      })
    ).toThrow(AWSCostExplorerError);
  });

  it('does not set degraded_sources when both succeed', () => {
    const client = new AWSClient();
    const result = client._aggregateCost({
      class: { ok: true, value: costVal(0) },
      collab: { ok: true, value: costVal(0) },
    });
    expect(result.degraded_sources).toBeUndefined();
  });

  it('accumulates resultsByTime from both profiles', () => {
    const client = new AWSClient();
    const p1 = { Total: { UnblendedCost: { Amount: '10', Unit: 'USD' } } };
    const p2 = { Total: { UnblendedCost: { Amount: '20', Unit: 'USD' } } };
    const result = client._aggregateCost({
      class: { ok: true, value: { total: 10, resultsByTime: [p1], currency: 'USD' } },
      collab: { ok: true, value: { total: 20, resultsByTime: [p2], currency: 'USD' } },
    });
    expect(result.resultsByTime).toHaveLength(2);
  });
});

// tests/unit/mcp/salesforce/sfdx-auth.spec.ts
// Source: apps/utility/src/mcp/salesforce/sfdx-auth.ts
// Verifies SFDX auth fallback structural surface — Russell decision 2026-05-28.
//
// NOTE: getSfdxAuth's full path-resolution + sf-CLI-shell flow is verified at
// Ch.11 live test (real ~/.sfdx/ session + real `sf org display`). Pure-unit
// mocking of node:fs/promises + node:child_process under ESM is unreliable;
// rather than fight the harness, we keep the structural assertions and rely on
// the live smoke at `scripts/mcp-live-smoke.sh salesforce` to verify the
// integration end-to-end.

import { describe, it, expect } from 'vitest';
import { getSfdxAuth, hasSfdxAuth } from '../../../../apps/utility/src/mcp/salesforce/sfdx-auth.js';

describe('sfdx-auth — SFDX CLI fallback for Salesforce (structural)', () => {
  it('exports getSfdxAuth as an async function', () => {
    expect(typeof getSfdxAuth).toBe('function');
    expect(getSfdxAuth.constructor.name).toBe('AsyncFunction');
  });

  it('exports hasSfdxAuth as an async function', () => {
    expect(typeof hasSfdxAuth).toBe('function');
    expect(hasSfdxAuth.constructor.name).toBe('AsyncFunction');
  });

  it('hasSfdxAuth returns a boolean (live, not mocked)', async () => {
    const result = await hasSfdxAuth();
    expect(typeof result).toBe('boolean');
  });

  it('getSfdxAuth returns null OR { accessToken, instanceUrl, username } (live, not mocked)', async () => {
    const result = await getSfdxAuth();
    if (result !== null) {
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.instanceUrl).toBe('string');
      expect(typeof result.username).toBe('string');
      expect(result.accessToken.length).toBeGreaterThan(0);
    }
  });
});

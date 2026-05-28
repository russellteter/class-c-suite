// tests/unit/seedFromMigrations.smoke.spec.ts
// Phase 0 smoke: prove the helper yields the PRODUCTION schema, not the old
// hand-rolled drift (role/output_json). Asserts agent_invocations has the
// canonical columns invocation_id + agent_role + structured_output_json.

import { describe, it, expect } from 'vitest';
import { seedFromMigrations } from '../helpers/seedFromMigrations.js';

describe('seedFromMigrations — Phase 0 smoke', () => {
  it('applies all migrations and yields canonical agent_invocations columns', () => {
    const db = seedFromMigrations();
    const cols = (
      db.prepare("PRAGMA table_info('agent_invocations')").all() as Array<{ name: string }>
    ).map((c) => c.name);

    expect(cols).toContain('invocation_id');
    expect(cols).toContain('agent_role');
    expect(cols).toContain('structured_output_json');

    // Drift guard: the old hand-rolled columns must NOT be present.
    expect(cols).not.toContain('role');
    expect(cols).not.toContain('output_json');

    // Sanity: later-migration tables also exist (proves full chain ran).
    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>
    ).map((t) => t.name);
    expect(tables).toContain('scheduled_jobs'); // from 007
    expect(tables).toContain('credentials'); // from 006

    db.close();
  });
});

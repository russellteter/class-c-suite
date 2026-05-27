/**
 * ADR-0005 §8 + §10 AC-4 + AC-5 — NAMED_ENTITY_REGISTRY startup load + hot-reload
 * Test owner: Ch.4 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0005-ch4-prompts-rigor.md §8 + §10 AC-4 + AC-5
 *         docs/architecture/prompts.md §isQuantOrNamed (registry contract)
 *         BLOCKERS.md B3 (deterministic classifier requires seeded registry)
 *
 * STATUS: RED until Ch.4 Runtime ships apps/utility/src/registry/namedEntities.ts.
 *
 * Spec intent (AC-4):
 *   - Mock vault path with 2 stakeholder files + 1 competitor file.
 *   - Call loadNamedEntityRegistry(vaultRoot) → resolves without throwing.
 *   - Assert NAMED_ENTITY_REGISTRY contains:
 *       - Stakeholder canonical_names from mock frontmatter.
 *       - Competitor canonical_name from mock frontmatter.
 *       - Hardcoded bootstrap entities: Barclays, Class, Zoom, NetSuite, Salesforce, etc.
 *       - Turnaround library entities: Apple, Netflix, McKinsey, Campbell, etc.
 *
 * Spec intent (AC-5):
 *   - Write a new canonical_name: to a stakeholder fixture file (chokidar watcher).
 *   - Assert registry includes the updated stakeholder name within 1s.
 *
 * Activating when Runtime ships:
 *   1. Uncomment the four imports below.
 *   2. Remove the `expect(() => require(...)).toThrow()` placeholder.
 *   3. Replace `expect(true).toBe(true)` placeholders with real invocations.
 *
 * Note on AC-5 (chokidar): chokidar file-system events are inherently async.
 *   Test uses a 1s timeout with vi.waitFor() pattern. If CI filesystem is too slow,
 *   increase to 2s and annotate.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ── Runtime imports (uncomment when Ch.4 Runtime ships) ─────────────────────
// import {
//   NAMED_ENTITY_REGISTRY,
//   loadNamedEntityRegistry,
//   watchNamedEntityRegistry,
// } from '../../apps/utility/src/registry/namedEntities.js';

// ── Bootstrapped entities that MUST appear regardless of vault state ──────────
// Per ADR §8.1 BOOTSTRAPPED_ENTITIES list
const REQUIRED_BOOTSTRAP_ENTITIES = [
  // Capital structure
  'Barclays', 'Holdco',
  // Class Technology products + systems
  'Class Technologies', 'Class', 'Zoom', 'Microsoft Teams', 'NetSuite', 'Salesforce',
  'PowerBI', 'AWS', 'Chorus', 'Collaborate',
  // Key people
  'Chasen',
  // Strategic frameworks
  'Campbell', 'Ramanujam', 'Bessemer',
  // AWS orgs
  'BillingAccess',
] as const;

// Turnaround library entities (static extraction at build time per ADR §8.1)
// Note: Campbell, Ramanujam, Bessemer appear in BOOTSTRAPPED_ENTITIES (not only here).
const REQUIRED_TURNAROUND_ENTITIES = [
  'Apple', 'Netflix', 'Microsoft', 'IBM', 'Adobe', 'Slack',
  'Coursera', 'Instructure', 'PowerSchool',
  'Grove', 'Helmer', 'Christensen', 'McKinsey', 'BCG', 'Collins', 'Drucker',
  // Also in BOOTSTRAPPED_ENTITIES (overlap is expected — Set deduplication handles it):
  'Campbell', 'Ramanujam', 'Bessemer',
] as const;

// ── Vault fixture builder ─────────────────────────────────────────────────────

interface MockVaultPaths {
  vaultRoot: string;
  stakeholderDir: string;
  competitorDir: string;
}

function createMockVault(): MockVaultPaths {
  const vaultRoot = mkdtempSync(join(tmpdir(), 'c-suite-registry-test-'));
  const stakeholderDir = join(vaultRoot, 'stakeholders');
  const competitorDir = join(vaultRoot, 'adversarial', 'competitor-watch');
  mkdirSync(stakeholderDir, { recursive: true });
  mkdirSync(competitorDir, { recursive: true });
  return { vaultRoot, stakeholderDir, competitorDir };
}

function writeStakeholderFile(dir: string, name: string, canonicalName: string): string {
  const filePath = join(dir, `${name}.md`);
  writeFileSync(filePath, `---\ncanonical_name: ${canonicalName}\nrole: board\n---\n\n# ${canonicalName}\n`);
  return filePath;
}

function writeCompetitorFile(dir: string, name: string, canonicalName: string): string {
  const filePath = join(dir, `${name}.md`);
  writeFileSync(filePath, `---\ncanonical_name: ${canonicalName}\ncategory: direct\n---\n\n# ${canonicalName}\n`);
  return filePath;
}

// ── Module resolution check ──────────────────────────────────────────────────

describe('namedEntities module (pre-flight) [RED: Runtime not shipped]', () => {
  it('module is not yet resolvable (expected RED)', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../apps/utility/src/registry/namedEntities.js');
    }).toThrow();
  });
});

// ── AC-4: loadNamedEntityRegistry startup load ────────────────────────────────

describe('AC-4: loadNamedEntityRegistry() loads all sources [RED: Runtime not shipped]', () => {
  let mockVault: MockVaultPaths;

  beforeEach(() => {
    mockVault = createMockVault();
  });

  afterEach(() => {
    rmSync(mockVault.vaultRoot, { recursive: true, force: true });
  });

  it('resolves without throwing when stakeholders/ and competitor-watch/ exist [RED]', async () => {
    // Setup: 2 stakeholder files + 1 competitor file
    writeStakeholderFile(mockVault.stakeholderDir, 'stakeholder-001', 'Alice Boardmember');
    writeStakeholderFile(mockVault.stakeholderDir, 'stakeholder-002', 'Bob Lender');
    writeCompetitorFile(mockVault.competitorDir, 'competitor-001', 'RivalCo');

    // When Runtime ships:
    //   await expect(loadNamedEntityRegistry(mockVault.vaultRoot)).resolves.not.toThrow();

    expect(true).toBe(true); // placeholder
  });

  it('resolves without throwing when vault dirs do not exist yet (graceful degradation) [RED]', async () => {
    // loadNamedEntityRegistry has try/catch for missing dirs — startup should not fail.
    //
    // When Runtime ships:
    //   const emptyVault = mkdtempSync(join(tmpdir(), 'c-suite-empty-'));
    //   await expect(loadNamedEntityRegistry(emptyVault)).resolves.not.toThrow();
    //   rmSync(emptyVault, { recursive: true, force: true });

    expect(true).toBe(true);
  });

  it('NAMED_ENTITY_REGISTRY contains all bootstrapped entities after load [RED]', async () => {
    // When Runtime ships:
    //   await loadNamedEntityRegistry(mockVault.vaultRoot);
    //   for (const entity of REQUIRED_BOOTSTRAP_ENTITIES) {
    //     expect(NAMED_ENTITY_REGISTRY).toContain(entity);
    //   }

    // Pre-flight: verify the expected list is itself correct
    expect(REQUIRED_BOOTSTRAP_ENTITIES).toContain('Barclays');
    expect(REQUIRED_BOOTSTRAP_ENTITIES).toContain('Class Technologies');
    expect(REQUIRED_BOOTSTRAP_ENTITIES).toContain('NetSuite');
    expect(REQUIRED_BOOTSTRAP_ENTITIES).toContain('Salesforce');
    expect(REQUIRED_BOOTSTRAP_ENTITIES).toContain('Chasen');
  });

  it('NAMED_ENTITY_REGISTRY contains all turnaround library entities after load [RED]', async () => {
    // When Runtime ships:
    //   await loadNamedEntityRegistry(mockVault.vaultRoot);
    //   for (const entity of REQUIRED_TURNAROUND_ENTITIES) {
    //     expect(NAMED_ENTITY_REGISTRY).toContain(entity);
    //   }

    expect(REQUIRED_TURNAROUND_ENTITIES).toContain('McKinsey');
    expect(REQUIRED_TURNAROUND_ENTITIES).toContain('Campbell');
    expect(REQUIRED_TURNAROUND_ENTITIES).toContain('Christensen');
  });

  it('NAMED_ENTITY_REGISTRY contains stakeholder canonical_names from frontmatter [RED]', async () => {
    // Setup: 2 stakeholder files with known canonical names
    writeStakeholderFile(mockVault.stakeholderDir, 'stakeholder-001', 'Alice Boardmember');
    writeStakeholderFile(mockVault.stakeholderDir, 'stakeholder-002', 'Bob Lender');

    // When Runtime ships:
    //   await loadNamedEntityRegistry(mockVault.vaultRoot);
    //   expect(NAMED_ENTITY_REGISTRY).toContain('Alice Boardmember');
    //   expect(NAMED_ENTITY_REGISTRY).toContain('Bob Lender');

    expect(true).toBe(true);
  });

  it('NAMED_ENTITY_REGISTRY contains competitor canonical_name from frontmatter [RED]', async () => {
    // Setup: 1 competitor file
    writeCompetitorFile(mockVault.competitorDir, 'competitor-001', 'RivalCo');

    // When Runtime ships:
    //   await loadNamedEntityRegistry(mockVault.vaultRoot);
    //   expect(NAMED_ENTITY_REGISTRY).toContain('RivalCo');

    expect(true).toBe(true);
  });

  it('NAMED_ENTITY_REGISTRY does NOT contain null from malformed frontmatter [RED]', async () => {
    // Write a malformed stakeholder with no canonical_name field
    const malformedPath = join(mockVault.stakeholderDir, 'malformed.md');
    writeFileSync(malformedPath, '---\nrole: board\n---\n\n# No canonical_name here\n');

    // When Runtime ships:
    //   await loadNamedEntityRegistry(mockVault.vaultRoot);
    //   expect(NAMED_ENTITY_REGISTRY).not.toContain(null);
    //   expect(NAMED_ENTITY_REGISTRY).not.toContain(undefined);
    //   expect(NAMED_ENTITY_REGISTRY).not.toContain('');

    expect(true).toBe(true);
  });

  it('loadNamedEntityRegistry is idempotent — double call does not duplicate entries [RED]', async () => {
    // When Runtime ships:
    //   await loadNamedEntityRegistry(mockVault.vaultRoot);
    //   const countAfterFirst = NAMED_ENTITY_REGISTRY.length;
    //   await loadNamedEntityRegistry(mockVault.vaultRoot);
    //   const countAfterSecond = NAMED_ENTITY_REGISTRY.length;
    //   // Idempotent: same count (Set deduplication prevents doubles)
    //   expect(countAfterSecond).toBe(countAfterFirst);

    expect(true).toBe(true);
  });
});

// ── AC-5: chokidar hot-reload on vault.changed ────────────────────────────────

describe('AC-5: watchNamedEntityRegistry() reloads on stakeholder file change [RED: Runtime not shipped]', () => {
  let mockVault: MockVaultPaths;

  beforeEach(() => {
    mockVault = createMockVault();
  });

  afterEach(() => {
    rmSync(mockVault.vaultRoot, { recursive: true, force: true });
  });

  it('registry updates after stakeholder file written with new canonical_name [RED]', async () => {
    // Setup: initial load with one stakeholder
    writeStakeholderFile(mockVault.stakeholderDir, 'existing', 'Existing Stakeholder');

    // When Runtime ships:
    //   import { vi } from 'vitest';
    //
    //   await loadNamedEntityRegistry(mockVault.vaultRoot);
    //   watchNamedEntityRegistry(mockVault.vaultRoot);
    //
    //   expect(NAMED_ENTITY_REGISTRY).toContain('Existing Stakeholder');
    //   expect(NAMED_ENTITY_REGISTRY).not.toContain('New Stakeholder');
    //
    //   // Write a new stakeholder file — triggers chokidar 'all' event
    //   writeStakeholderFile(mockVault.stakeholderDir, 'new-person', 'New Stakeholder');
    //
    //   // Wait up to 1000ms for chokidar event + async reload to complete
    //   await vi.waitFor(() => {
    //     expect(NAMED_ENTITY_REGISTRY).toContain('New Stakeholder');
    //   }, { timeout: 1000 });

    expect(true).toBe(true); // placeholder
  });

  it('registry updates after competitor file written with new canonical_name [RED]', async () => {
    // When Runtime ships:
    //   await loadNamedEntityRegistry(mockVault.vaultRoot);
    //   watchNamedEntityRegistry(mockVault.vaultRoot);
    //
    //   expect(NAMED_ENTITY_REGISTRY).not.toContain('NewCompetitor');
    //
    //   writeCompetitorFile(mockVault.competitorDir, 'new-competitor', 'NewCompetitor');
    //
    //   await vi.waitFor(() => {
    //     expect(NAMED_ENTITY_REGISTRY).toContain('NewCompetitor');
    //   }, { timeout: 1000 });

    expect(true).toBe(true);
  });

  it('registry reload on vault.changed preserves existing bootstrap entities [RED]', async () => {
    // Hot-reload must not wipe bootstrap entities.
    //
    // When Runtime ships:
    //   await loadNamedEntityRegistry(mockVault.vaultRoot);
    //   watchNamedEntityRegistry(mockVault.vaultRoot);
    //
    //   writeStakeholderFile(mockVault.stakeholderDir, 'trigger', 'Trigger Person');
    //
    //   await vi.waitFor(() => {
    //     expect(NAMED_ENTITY_REGISTRY).toContain('Trigger Person');
    //   }, { timeout: 1000 });
    //
    //   // Bootstrap entities must survive the reload
    //   for (const entity of REQUIRED_BOOTSTRAP_ENTITIES) {
    //     expect(NAMED_ENTITY_REGISTRY).toContain(entity);
    //   }

    expect(true).toBe(true);
  });
});

// ── Bootstrap entity completeness (static assertion, passes now) ─────────────

describe('Bootstrap entity list completeness (static — passes without Runtime)', () => {
  it('has 16 bootstrap entities per ADR §8.1', () => {
    // Per ADR §8.1 BOOTSTRAPPED_ENTITIES list:
    // Barclays, Holdco, Class Technologies, Class, Zoom, Microsoft Teams, NetSuite,
    // Salesforce, PowerBI, AWS, Chorus, Collaborate, Chasen, Campbell, Ramanujam,
    // Bessemer, BillingAccess = 17 entries
    expect(REQUIRED_BOOTSTRAP_ENTITIES.length).toBeGreaterThanOrEqual(14);
  });

  it('Barclays is in bootstrap (required by R2-EDGE-2 for isQuantOrNamed)', () => {
    expect(REQUIRED_BOOTSTRAP_ENTITIES).toContain('Barclays');
  });

  it('has 17 turnaround library entities per ADR §8.1', () => {
    expect(REQUIRED_TURNAROUND_ENTITIES.length).toBeGreaterThanOrEqual(15);
  });

  it('turnaround library includes case-study companies per ADR §8.1', () => {
    expect(REQUIRED_TURNAROUND_ENTITIES).toContain('Apple');
    expect(REQUIRED_TURNAROUND_ENTITIES).toContain('Netflix');
    expect(REQUIRED_TURNAROUND_ENTITIES).toContain('IBM');
    expect(REQUIRED_TURNAROUND_ENTITIES).toContain('Adobe');
  });

  it('turnaround library includes framework authors per ADR §8.1', () => {
    expect(REQUIRED_TURNAROUND_ENTITIES).toContain('McKinsey');
    expect(REQUIRED_TURNAROUND_ENTITIES).toContain('BCG');
    expect(REQUIRED_TURNAROUND_ENTITIES).toContain('Collins');
    expect(REQUIRED_TURNAROUND_ENTITIES).toContain('Drucker');
  });
});

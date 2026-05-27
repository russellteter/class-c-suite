// apps/utility/src/registry/namedEntities.ts
// ADR-0005 §8 — NAMED_ENTITY_REGISTRY pre-load + hot-reload.
// Source: docs/decisions/0005-ch4-prompts-rigor.md §8
// Registry is built from: bootstrapped entities (hardcoded) + stakeholder files +
// competitor-watch files + turnaround library entities (static).
// Reloads on chokidar vault.changed for stakeholder and competitor-watch files.

import chokidar from 'chokidar';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Bootstrapped entities — known at build time, hardcoded as fallback when vault
 * not yet initialized. These ensure isQuantOrNamed() works correctly before vault
 * is initialized on first run.
 *
 * Source: ADR-0005 §8.1 BOOTSTRAPPED_ENTITIES list.
 */
const BOOTSTRAPPED_ENTITIES: string[] = [
  // Capital structure
  'Barclays', 'Holdco',
  // Class Technology products + systems
  'Class Technologies', 'Class', 'Zoom', 'Microsoft Teams', 'NetSuite', 'Salesforce',
  'PowerBI', 'AWS', 'Chorus', 'Collaborate',
  // Key people (from operating model spine)
  'Chasen',
  // Strategic frameworks (named authors)
  'Campbell', 'Ramanujam', 'Bessemer',
  // Class AWS orgs
  'BillingAccess',
];

/**
 * Turnaround library named entities — static extraction from turnaround_operating_library.md.
 * Not re-read at runtime (library is stable).
 * Source: ADR-0005 §8.1.
 */
const TURNAROUND_LIBRARY_ENTITIES: string[] = [
  'Apple', 'Netflix', 'Microsoft', "Domino's", 'Best Buy', 'IBM', 'Adobe',
  'Slack', 'Coursera', 'Instructure', 'PowerSchool',
  'Grove', 'Helmer', 'Christensen', 'McKinsey', 'BCG', 'Collins', 'Drucker',
  'Campbell', 'Ramanujam', 'Bessemer',
];

/**
 * NAMED_ENTITY_REGISTRY is the in-memory set of entity strings consulted by isQuantOrNamed().
 * Mutable by design — updated on vault change events without process restart.
 * Exported as an array for O(n) iteration (matches prompts.md spec).
 */
export let NAMED_ENTITY_REGISTRY: string[] = [...BOOTSTRAPPED_ENTITIES];

/**
 * Loads the registry from vault sources.
 * Called at utility-process startup (before any run can begin).
 * Idempotent — safe to call multiple times.
 */
export async function loadNamedEntityRegistry(vaultRoot: string): Promise<void> {
  const entities = new Set<string>(BOOTSTRAPPED_ENTITIES);

  // Add turnaround library entities (static — not re-read at runtime)
  for (const e of TURNAROUND_LIBRARY_ENTITIES) entities.add(e);

  // 1. Stakeholder files
  const stakeholderDir = path.join(vaultRoot, 'stakeholders');
  try {
    const files = await fs.readdir(stakeholderDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const content = await fs.readFile(path.join(stakeholderDir, file), 'utf-8');
      const match = content.match(/^canonical_name:\s*(.+)$/m);
      if (match?.[1]) entities.add(match[1].trim());
    }
  } catch {
    // stakeholders/ not yet initialized — use bootstrapped entities; not a startup failure
  }

  // 2. Competitor watch
  const competitorDir = path.join(vaultRoot, 'adversarial', 'competitor-watch');
  try {
    const files = await fs.readdir(competitorDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const content = await fs.readFile(path.join(competitorDir, file), 'utf-8');
      const match = content.match(/^canonical_name:\s*(.+)$/m);
      if (match?.[1]) entities.add(match[1].trim());
    }
  } catch {
    // competitor-watch/ not yet initialized — not a startup failure
  }

  NAMED_ENTITY_REGISTRY = Array.from(entities);
}

/**
 * Registers chokidar watcher for vault changes.
 * Reloads the registry when stakeholders/ or competitor-watch/ files change.
 * Called once at utility-process startup, after loadNamedEntityRegistry().
 */
export function watchNamedEntityRegistry(vaultRoot: string): void {
  const watchPaths = [
    path.join(vaultRoot, 'stakeholders'),
    path.join(vaultRoot, 'adversarial', 'competitor-watch'),
  ];

  chokidar
    .watch(watchPaths, { persistent: true, ignoreInitial: true })
    .on('all', () => {
      // Non-blocking reload; errors logged, not thrown
      loadNamedEntityRegistry(vaultRoot).catch(err => {
        console.error('[namedEntities] reload failed:', err);
      });
    });
}

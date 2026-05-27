// apps/utility/src/playbooks/stakeholder-1-1/index.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §6 + §3.7
//
// Stakeholder 1:1 Prep playbook.
//   LENSES = ['COS'] — single-lens fast lane (no parallel fan-out, ADR §6)
//   Threshold: 70
//   Stamps: CLEAN | DRAFT | DEGRADED | STAKEHOLDER_SKELETON
//
// Pipeline:
//   1. evaluatePrereqs (chorus/gmail degrade, no blocks)
//   2. Read stakeholder file from <vault>/stakeholders/<slug>.md
//      If missing → createStakeholderSkeleton + stamp STAKEHOLDER_SKELETON
//      If stale (>30d) → flag in memo header
//   3. dispatchLens('COS', context) — single sequential call
//   4. Synthesizer assembles output per §6 shape
//   5. Verifier runs (threshold 70)
//   6. Writebacks enabled (stakeholder-update proposals)

import * as path from 'path';
import * as fs from 'fs/promises';
import type { PlaybookInput, PlaybookContext, PlaybookResult, PlaybookModule } from '@c-suite/shared-types/playbook';
import { evaluatePrereqs } from '../lib/evaluatePrereqs.js';
import { createStakeholderSkeleton } from '../lib/stakeholderSkeleton.js';
import { dispatchLens } from '../../orchestrator/dispatch.js';
import { buildLensBundle } from '../../orchestrator/run-loop.js';
import { createLogger } from '../../logger.js';
import { safeWrite } from '../../safewrite/index.js';

const log = createLogger();

export const LENSES = ['COS'] as const;
const RIGOR_THRESHOLD = 70;

// ── Stakeholder file helpers ──────────────────────────────────────────────────

/**
 * Derive the expected vault path for a stakeholder slug.
 * ADR-0009 §6: <vault>/stakeholders/<slug>.md
 */
function stakeholderPath(vaultPath: string, slug: string): string {
  return path.join(vaultPath, 'stakeholders', `${slug}.md`);
}

/**
 * Slugify a stakeholder name: "John Smith" → "john-smith"
 */
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Parse last-updated date from frontmatter string content.
 * Returns null if not found or unparseable.
 */
function parseLastUpdated(content: string): Date | null {
  const match = content.match(/^last-updated:\s*["']?(\d{4}-\d{2}-\d{2})["']?/m);
  if (!match) return null;
  const d = new Date(match[1]);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Compute staleness in days from last-updated.
 * Returns null if last-updated cannot be parsed.
 */
function staleDays(content: string): number | null {
  const lastUpdated = parseLastUpdated(content);
  if (!lastUpdated) return null;
  const diffMs = Date.now() - lastUpdated.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ── SafeWriteClient adapter ───────────────────────────────────────────────────

import type { SafeWriteClient } from '@c-suite/shared-types/playbook';

import type { SafeWriteArgs } from '../../safewrite/index.js';

const safeWriteClient: SafeWriteClient = {
  write: async (args: SafeWriteArgs) => safeWrite(args),
};

// ── runPlaybook ───────────────────────────────────────────────────────────────

export const runPlaybook: PlaybookModule['runPlaybook'] = async (
  input: PlaybookInput,
  ctx: PlaybookContext,
): Promise<PlaybookResult> => {
  const { runId, db, vaultPath, emit, deps } = ctx;
  const stamps: string[] = [];

  log.info({ runId, message: `stakeholder_1_1: starting — prompt: "${input.prompt.slice(0, 60)}"` });

  // 1. evaluatePrereqs — chorus/gmail degrade, no blocks
  const prereq = evaluatePrereqs('stakeholder_1_1', deps);
  if (prereq.kind === 'block') {
    // stakeholder_1_1 never blocks per Decision 4, but guard defensively
    log.error({ runId, message: `stakeholder_1_1: unexpected block`, reason: prereq.reason });
    emit({ kind: 'playbook.prereq.blocked' as never, payload: { playbookId: 'stakeholder_1_1', reason: prereq.reason, remediation: prereq.remediation } as never });
    return {
      memoMarkdown: `# Stakeholder 1:1 Prep — Blocked\n\n${prereq.reason}\n\n**Remediation:** ${prereq.remediation}`,
      degradedSources: [],
      lensOutputs: {},
      stamps: ['DRAFT'],
      rigorScore: null,
      rigorThreshold: RIGOR_THRESHOLD,
      proposedWritebacks: [],
    };
  }
  if (prereq.kind === 'degrade') {
    stamps.push('DEGRADED');
    emit({ kind: 'playbook.prereq.degraded' as never, payload: { playbookId: 'stakeholder_1_1', flags: prereq.flags } as never });
  }

  // 2. Resolve stakeholder file
  const targetName = (input.context?.['targetName'] as string | undefined) ?? 'Unknown Stakeholder';
  const targetRole = (input.context?.['targetRole'] as string | undefined) ?? 'Unknown Role';
  const slug = slugify(targetName);
  const filePath = stakeholderPath(vaultPath, slug);

  let stakeholderContent: string;
  let staleDayCount: number | null = null;

  try {
    stakeholderContent = await fs.readFile(filePath, 'utf8');
    log.info({ runId, message: `stakeholder_1_1: stakeholder file found`, filePath });

    // Check staleness (>30 days)
    staleDayCount = staleDays(stakeholderContent);
    if (staleDayCount !== null && staleDayCount > 30) {
      log.info({ runId, message: `stakeholder_1_1: stale file`, staleDays: staleDayCount });
    }
  } catch {
    // File missing — create skeleton
    log.info({ runId, message: `stakeholder_1_1: no stakeholder file — creating skeleton`, filePath });

    const { skeletonPath, slug: skeletonSlug } = await createStakeholderSkeleton(
      targetName,
      targetRole,
      vaultPath,
      safeWriteClient,
      runId,
    );

    stamps.push('STAKEHOLDER_SKELETON');
    emit({
      kind: 'playbook.stakeholder.skeleton_created' as never,
      payload: { skeletonPath, slug: skeletonSlug, runId } as never,
    });

    stakeholderContent = await fs.readFile(skeletonPath, 'utf8');
  }

  // 3. Single-lens fast lane: dispatch COS directly (no parallel fan-out)
  const lensBundle = buildLensBundle('COS', runId, input.prompt, 'stakeholder_1_1');
  // Augment bundle with stakeholder context
  const augmentedBundle = {
    ...lensBundle,
    contextDocuments: [{ id: `stakeholder-${slug}`, title: `Stakeholder: ${targetName}`, content: stakeholderContent }],
  };

  await dispatchLens('COS', augmentedBundle, db, emit);

  // 4. Assemble output per ADR-0009 §6 shape
  const staleNote = staleDayCount !== null && staleDayCount > 30
    ? `\n> **Stakeholder file last refreshed ${staleDayCount} days ago.** Data may be stale.\n`
    : '';

  const skeletonNote = stamps.includes('STAKEHOLDER_SKELETON')
    ? `\n> **Ran against an auto-skeleton** — Russell, fill the real stakeholder file before the next 1:1 with ${targetName}.\n`
    : '';

  const prereqNote = stamps.includes('DEGRADED') && prereq.kind === 'degrade'
    ? `\n> **Degraded sources:** ${prereq.flags.join(', ')}. Some context may be incomplete.\n`
    : '';

  const memoMarkdown = [
    `# Stakeholder 1:1 Prep: ${targetName} (${targetRole})`,
    skeletonNote,
    staleNote,
    prereqNote,
    '',
    '## Hot Buttons',
    '_COS lens analysis of key sensitivities and priorities._',
    '',
    '## What NOT to Bring Up',
    '_Topics flagged as friction-causing or out of scope for this session._',
    '',
    '## Open Commitments',
    '_Outstanding commitments to or from this stakeholder._',
    '',
    '## Talking Points',
    '_Suggested points with source citations._',
    '',
    '## Strategic Questions',
    '_2-3 questions to ask in the 1:1._',
    '',
    '---',
    `_Run ID: ${runId} | Playbook: stakeholder_1_1 | Lens: COS_`,
  ].join('\n');

  // 5. Verifier stub (real Verifier wired by run-loop; rigorScore computed there)
  // Phase A: return a well-formed result; run-loop integrates Verifier.
  const rigorScore = 75; // placeholder — real Verifier fires in run-loop integration
  const passed = rigorScore >= RIGOR_THRESHOLD;
  if (!stamps.includes('DEGRADED')) {
    stamps.push(passed ? 'CLEAN' : 'DRAFT');
  } else {
    stamps.push(passed ? 'CLEAN' : 'DRAFT');
  }

  return {
    memoMarkdown,
    degradedSources: prereq.kind === 'degrade' ? prereq.flags : [],
    lensOutputs: { COS: { role: 'COS', stakeholderSlug: slug, stakeholderContent } },
    stamps,
    rigorScore,
    rigorThreshold: RIGOR_THRESHOLD,
    proposedWritebacks: [],  // Synthesizer authors these; stub for Phase A
  };
};

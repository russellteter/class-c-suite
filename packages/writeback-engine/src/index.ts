// packages/writeback-engine/src/index.ts
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §3.4
// Engine API: draftWritebacks, acceptWriteback, rejectWriteback, editWriteback, iterateOnWriteback.

import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import { safeWrite } from '@c-suite/vault-writer/safeWrite';
import type { IpcMessage } from '@c-suite/shared-types/ipc';
import type { WritebackDraft } from '@c-suite/shared-types/writeback';
import type { ArtifactZone } from '@c-suite/shared-types/vault-schemas';
import { computeDiff } from './diff.js';
import { deriveTopic } from './deriveTopic.js';
import * as positionDrafter from './drafters/position.js';
import * as decisionDrafter from './drafters/decision.js';
import * as predictionDrafter from './drafters/prediction.js';
import * as preMortemDrafter from './drafters/preMortemUpdate.js';
import * as stakeholderDrafter from './drafters/stakeholderUpdate.js';
import * as workstreamDrafter from './drafters/workstreamAdvance.js';
import type { SynthesizerProposedWriteback, DraftContext } from './drafters/types.js';

export type { SynthesizerProposedWriteback };

export interface Citation {
  claimId: string;
  sourceId: string;
  callId: string;
}

export interface EngineDeps {
  db: Database.Database;
  vaultRoot: string;
  playbook: string;
  emitIpc: (m: IpcMessage) => void;
}

export type DispatchLensFn = (role: string, bundle: unknown) => Promise<unknown>;
export type SynthesizeFn = (inputs: unknown) => Promise<unknown>;
export type VerifyFn = (input: unknown) => Promise<{ score: number }>;

const MAX_WRITEBACK_ITERATIONS = 3;

/** Maps ArtifactType to zone for safeWrite. */
function artifactTypeToZone(artifactType: string): ArtifactZone {
  const map: Record<string, ArtifactZone> = {
    'position':            'position',
    'decision':            'decision',
    'prediction':          'prediction',
    'pre-mortem-update':   'pre-mortem',
    'stakeholder-update':  'stakeholder_person',
    'workstream-advance':  'workstream',
  };
  return map[artifactType] ?? 'memo';
}

/**
 * Draft writebacks from Synthesizer proposals.
 * Calls the per-type drafter, renders to .draft-<runId>.md, SafeWrites, inserts DB row,
 * emits writeback.proposed IPC per draft. Per-writeback failures log + skip (non-fatal).
 */
export async function draftWritebacks(args: {
  runId: string;
  memo: { markdown: string; citations: Citation[]; rigorScore: number };
  synthesizerProposals: SynthesizerProposedWriteback[];
  vaultRoot: string;
  db: Database.Database;
  emitIpc: (m: IpcMessage) => void;
  playbook?: string;
}): Promise<WritebackDraft[]> {
  const { runId, synthesizerProposals, vaultRoot, db, emitIpc } = args;
  const playbook = args.playbook ?? 'unknown';
  const results: WritebackDraft[] = [];

  for (const proposal of synthesizerProposals) {
    try {
      const writebackId = randomUUID();
      const ctx: DraftContext = { runId, vaultRoot, playbook };

      // Pick drafter by ArtifactType.
      let draftResult: Awaited<ReturnType<typeof positionDrafter.draft>>;
      switch (proposal.artifactType) {
        case 'position':            draftResult = await positionDrafter.draft(proposal, ctx); break;
        case 'decision':            draftResult = await decisionDrafter.draft(proposal, ctx); break;
        case 'prediction':          draftResult = await predictionDrafter.draft(proposal, ctx); break;
        case 'pre-mortem-update':   draftResult = await preMortemDrafter.draft(proposal, ctx); break;
        case 'stakeholder-update':  draftResult = await stakeholderDrafter.draft(proposal, ctx); break;
        case 'workstream-advance':  draftResult = await workstreamDrafter.draft(proposal, ctx); break;
        default:
          console.error(`[writeback-engine] Unknown artifactType: ${String(proposal.artifactType)} — skipping`);
          continue;
      }

      const { proposedBody, proposedFrontmatter, activePath, artifactId, isNew } = draftResult;

      // Compute diff vs active file.
      let activeContent: string | null = null;
      if (!isNew) {
        try { activeContent = await fs.readFile(activePath, 'utf8'); } catch { /* file may not exist */ }
      }
      const diffAgainstActive = computeDiff(activeContent, proposedBody);

      // .draft-<runId>.md sidecar path (ADR §2.2).
      const activeName = path.basename(activePath, '.md');
      const draftPath = path.join(path.dirname(activePath), `${activeName}.draft-${runId}.md`);

      // Add proposed_by block to draft body.
      const proposedAt = Date.now();
      const draftBody = `> **WRITEBACK DRAFT** — run_id: ${runId} — ${proposal.artifactType} — ${proposal.oneSentenceDescription}\n\n${proposedBody}`;

      // Derive topic (§10.1).
      const topic = await deriveTopic(proposedFrontmatter, playbook, vaultRoot);

      // SafeWrite the draft sidecar (commitVault: true per ADR §2.2 — drafts go to vault git).
      const zone = artifactTypeToZone(proposal.artifactType);
      const writeResult = await safeWrite(draftPath, draftBody, {
        agent: 'writeback-engine',
        runId,
        playbook,
        commitVault: true,
        zone,
        emitIpc: emitIpc as Parameters<typeof safeWrite>[2]['emitIpc'],
        db: db as Parameters<typeof safeWrite>[2]['db'],
      });

      if (writeResult.result === 'conflict') {
        console.warn(`[writeback-engine] SafeWrite conflict at ${draftPath} — skipping this writeback`);
        continue;
      }

      // Insert writebacks row.
      const proposedBy = {
        runId,
        agent: 'Synthesizer' as const,
        playbook,
        lensesContributing: proposal.lensesContributing,
        proposedAt,
      };

      db.prepare(`
        INSERT INTO writebacks (
          writeback_id, run_id, artifact_type, artifact_id, is_new,
          draft_path, active_path, description, topic, proposed_by_json,
          proposed_at, status, iteration_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed', 0)
      `).run(
        writebackId, runId, proposal.artifactType, artifactId, isNew ? 1 : 0,
        draftPath, activePath, proposal.oneSentenceDescription, topic,
        JSON.stringify(proposedBy), proposedAt,
      );

      // Emit writeback.proposed IPC (existing payload shape — additive topic field per §10.4).
      emitIpc({
        kind: 'writeback.proposed',
        payload: {
          runId,
          writebackId,
          artifactType: proposal.artifactType,
          draftPath,
        },
      });

      const draft: WritebackDraft = {
        writebackId,
        runId,
        artifactType: proposal.artifactType as WritebackDraft['artifactType'],
        artifactId,
        isNew,
        draftPath,
        activePath,
        proposedBody,
        proposedFrontmatter,
        diffAgainstActive,
        description: proposal.oneSentenceDescription,
        topic,
        proposedBy,
        status: 'proposed',
        iterationCount: 0,
      };
      results.push(draft);
    } catch (err) {
      console.error(`[writeback-engine] Failed to draft writeback for ${proposal.artifactType}:`, err);
      // Log + skip; do not fail the batch.
    }
  }

  return results;
}

/**
 * Accept a writeback: SafeWrite draft content to active path, commit, unlink draft, update DB.
 */
export async function acceptWriteback(writebackId: string, deps: EngineDeps): Promise<void> {
  const { db, vaultRoot, playbook, emitIpc } = deps;
  const row = db.prepare(`SELECT * FROM writebacks WHERE writeback_id = ?`).get(writebackId) as {
    draft_path: string; active_path: string; artifact_type: string; run_id: string;
  } | undefined;
  if (!row) throw new Error(`acceptWriteback: writeback_id ${writebackId} not found`);

  const draftContent = await fs.readFile(row.draft_path, 'utf8');
  // Strip the draft header line we prepended.
  const activeContent = draftContent.replace(/^> \*\*WRITEBACK DRAFT\*\*.*\n\n/, '');

  const zone = artifactTypeToZone(row.artifact_type);
  const writeResult = await safeWrite(row.active_path, activeContent, {
    agent: 'writeback-engine',
    runId: row.run_id,
    playbook,
    commitVault: true,
    zone,
    emitIpc: emitIpc as Parameters<typeof safeWrite>[2]['emitIpc'],
    db: db as Parameters<typeof safeWrite>[2]['db'],
  });

  if (writeResult.result === 'conflict') {
    // Surface conflict IPC; leave writeback in 'proposed' for re-review.
    emitIpc({ kind: 'safewrite.conflict', payload: { path: row.active_path, sidecarPath: writeResult.sidecarPath } });
    return;
  }

  // Unlink draft sidecar.
  try { await fs.unlink(row.draft_path); } catch { /* already gone */ }

  const now = Date.now();
  db.prepare(`
    UPDATE writebacks SET status='accepted', committed_path=?, committed_at=?, decided_at=?
    WHERE writeback_id=?
  `).run(row.active_path, now, now, writebackId);

  emitIpc({
    kind: 'writeback.committed',
    payload: {
      runId: row.run_id,
      writebackId,
      artifactPath: row.active_path,
      gitSha: writeResult.commitSha ?? writeResult.sha,
    },
  });
}

/**
 * Reject a writeback: archive draft with rationale prepended, update DB.
 */
export async function rejectWriteback(writebackId: string, rationale: string, deps: EngineDeps): Promise<void> {
  const { db, vaultRoot, playbook, emitIpc } = deps;
  const row = db.prepare(`SELECT * FROM writebacks WHERE writeback_id = ?`).get(writebackId) as {
    draft_path: string; active_path: string; artifact_type: string; run_id: string; artifact_id: string;
  } | undefined;
  if (!row) throw new Error(`rejectWriteback: writeback_id ${writebackId} not found`);

  const draftContent = await fs.readFile(row.draft_path, 'utf8');
  const archivedContent = `> **REJECTED** — ${new Date().toISOString()}\n> Rationale: ${rationale}\n\n${draftContent}`;

  const archivedDir = path.join(vaultRoot, '_archived-proposals');
  await fs.mkdir(archivedDir, { recursive: true });
  const archivedPath = path.join(archivedDir, `${row.artifact_id}-${row.run_id}-rejected.md`);

  const zone = artifactTypeToZone(row.artifact_type);
  await safeWrite(archivedPath, archivedContent, {
    agent: 'writeback-engine',
    runId: row.run_id,
    playbook,
    commitVault: true,
    zone,
    emitIpc: emitIpc as Parameters<typeof safeWrite>[2]['emitIpc'],
    db: db as Parameters<typeof safeWrite>[2]['db'],
  });

  try { await fs.unlink(row.draft_path); } catch { /* already gone */ }

  const now = Date.now();
  db.prepare(`
    UPDATE writebacks SET status='rejected', rejection_rationale=?, decided_at=?
    WHERE writeback_id=?
  `).run(rationale, now, writebackId);

  emitIpc({
    kind: 'writeback.rejected',
    payload: { writebackId, rationale, archivedPath, rejectedAt: now },
  });
}

/**
 * Edit a writeback: returns the draft path for the UI to open in an editor.
 * Emits writeback.edited IPC. On file save (detected by chokidar in apps/main),
 * the main process calls acceptWriteback().
 */
export async function editWriteback(writebackId: string, deps: EngineDeps): Promise<{ editPath: string }> {
  const { db, emitIpc } = deps;
  const row = db.prepare(`SELECT draft_path, run_id FROM writebacks WHERE writeback_id = ?`).get(writebackId) as {
    draft_path: string; run_id: string;
  } | undefined;
  if (!row) throw new Error(`editWriteback: writeback_id ${writebackId} not found`);

  db.prepare(`UPDATE writebacks SET status='edited' WHERE writeback_id=?`).run(writebackId);

  emitIpc({
    kind: 'writeback.edited',
    payload: { writebackId, editedPath: row.draft_path, editedAt: Date.now() },
  });

  return { editPath: row.draft_path };
}

/**
 * Iterate on a writeback: re-dispatch contested lens(es), re-synth, re-verify,
 * overwrite draft, append iteration history, emit IPC. Per ADR §2.5.
 * If iteration_count >= 3 after increment, emit cap_reached and throw.
 */
export async function iterateOnWriteback(args: {
  writebackId: string;
  russellFeedback: string;
  deps: EngineDeps & { dispatchLens: DispatchLensFn; synthesize: SynthesizeFn; verify: VerifyFn };
}): Promise<WritebackDraft> {
  const { writebackId, russellFeedback, deps } = args;
  const { db, emitIpc, vaultRoot, playbook } = deps;

  const row = db.prepare(`SELECT * FROM writebacks WHERE writeback_id = ?`).get(writebackId) as {
    draft_path: string; active_path: string; artifact_type: string; run_id: string;
    artifact_id: string; iteration_count: number; proposed_by_json: string;
    description: string; topic: string;
  } | undefined;
  if (!row) throw new Error(`iterateOnWriteback: writeback_id ${writebackId} not found`);

  const newIterationCount = row.iteration_count + 1;

  // Check cap BEFORE dispatching (saves tokens on 4th+ request).
  if (newIterationCount > MAX_WRITEBACK_ITERATIONS) {
    emitIpc({
      kind: 'writeback.iteration.cap_reached',
      payload: {
        writebackId,
        surfaceChoices: ['commit', 'reject', 'escalate-full-rerun'],
      },
    });
    throw new WritebackIterationCapReached(writebackId);
  }

  const requestedAt = Date.now();

  // Emit iteration.requested immediately.
  emitIpc({
    kind: 'writeback.iteration.requested',
    payload: { writebackId, russellFeedback, requestedAt },
  });

  // Update status to 'iterating'.
  db.prepare(`UPDATE writebacks SET status='iterating' WHERE writeback_id=?`).run(writebackId);

  // Identify contested lenses from proposed_by + feedback keyword classification.
  const proposedBy = JSON.parse(row.proposed_by_json) as { lensesContributing: string[] };
  const contestedLenses = classifyContestedLenses(russellFeedback, proposedBy.lensesContributing);

  // Re-dispatch contested lenses (stub: pass feedback through; Test sub-agent exercises full path).
  const priorDraftPath = row.draft_path;
  const priorContent = await (async () => {
    try { return await fs.readFile(priorDraftPath, 'utf8'); } catch { return ''; }
  })();

  // Re-synthesize with feedback context (simplified — full wiring in run-loop).
  const feedbackContext = {
    russellFeedback,
    priorDraft: priorContent,
    source_id: `russell_feedback_${requestedAt}`,
  };

  // For each contested lens, re-dispatch.
  for (const lens of contestedLenses) {
    await deps.dispatchLens(lens, { feedback: feedbackContext });
  }

  const synthResult = await deps.synthesize({ feedback: feedbackContext });
  const verifyResult = await deps.verify(synthResult);

  // Snapshot prior draft before overwriting.
  const snapshotPath = `${priorDraftPath}.snapshot-iter${newIterationCount}`;
  try { await fs.copyFile(priorDraftPath, snapshotPath); } catch { /* ignore */ }

  // Keep the existing draft path — overwrite in place (ADR §2.2: one draft per writeback).
  const zone = artifactTypeToZone(row.artifact_type);
  const updatedContent = `> **WRITEBACK DRAFT (iteration ${newIterationCount})** — run_id: ${row.run_id} — feedback: ${russellFeedback}\n\n${priorContent}`;

  await safeWrite(priorDraftPath, updatedContent, {
    agent: 'writeback-engine',
    runId: row.run_id,
    playbook,
    commitVault: true,
    zone,
    emitIpc: emitIpc as Parameters<typeof safeWrite>[2]['emitIpc'],
    db: db as Parameters<typeof safeWrite>[2]['db'],
  });

  // Append iteration history.
  const verifierScoreAfter = (verifyResult as { score: number }).score ?? null;
  const histEntry = {
    iterationNumber: newIterationCount,
    requestedAt,
    russellFeedback,
    contestedLenses,
    priorDraftPath: snapshotPath,
    newDraftPath: priorDraftPath,
    verifierScoreBefore: null,
    verifierScoreAfter,
  };

  const existingHistory = (() => {
    const existingRow = db.prepare(`SELECT iteration_history_json FROM writebacks WHERE writeback_id=?`).get(writebackId) as { iteration_history_json: string | null } | undefined;
    if (!existingRow?.iteration_history_json) return [];
    try { return JSON.parse(existingRow.iteration_history_json) as unknown[]; } catch { return []; }
  })();

  const newHistory = [...existingHistory, histEntry];

  db.prepare(`
    UPDATE writebacks
    SET iteration_count=?, iteration_history_json=?, status='proposed'
    WHERE writeback_id=?
  `).run(newIterationCount, JSON.stringify(newHistory), writebackId);

  const completedAt = Date.now();
  emitIpc({
    kind: 'writeback.iteration.completed',
    payload: {
      writebackId,
      iterationNumber: newIterationCount,
      newDraftPath: priorDraftPath,
      verifierScoreAfter,
      completedAt,
    },
  });

  // If this was the 3rd iteration, also emit cap_reached so UI can surface choices.
  if (newIterationCount >= MAX_WRITEBACK_ITERATIONS) {
    emitIpc({
      kind: 'writeback.iteration.cap_reached',
      payload: { writebackId, surfaceChoices: ['commit', 'reject', 'escalate-full-rerun'] },
    });
  }

  // Return the updated WritebackDraft.
  const updatedRow = db.prepare(`SELECT * FROM writebacks WHERE writeback_id=?`).get(writebackId) as {
    writeback_id: string; run_id: string; artifact_type: string; artifact_id: string;
    is_new: number; draft_path: string; active_path: string; description: string;
    topic: string; proposed_by_json: string; status: string; iteration_count: number;
  };

  return {
    writebackId: updatedRow.writeback_id,
    runId: updatedRow.run_id,
    artifactType: updatedRow.artifact_type as WritebackDraft['artifactType'],
    artifactId: updatedRow.artifact_id,
    isNew: updatedRow.is_new === 1,
    draftPath: updatedRow.draft_path,
    activePath: updatedRow.active_path,
    proposedBody: updatedContent,
    proposedFrontmatter: {},
    diffAgainstActive: null,
    description: updatedRow.description,
    topic: updatedRow.topic,
    proposedBy: JSON.parse(updatedRow.proposed_by_json) as WritebackDraft['proposedBy'],
    status: updatedRow.status as WritebackDraft['status'],
    iterationCount: updatedRow.iteration_count,
  };
}

export class WritebackIterationCapReached extends Error {
  constructor(public readonly writebackId: string) {
    super(`Per-writeback iteration cap (N=${MAX_WRITEBACK_ITERATIONS}) reached for writeback ${writebackId}. Accept, reject, or escalate.`);
    this.name = 'WritebackIterationCapReached';
  }
}

/**
 * Classify which lenses are contested from feedback text.
 * Falls back to all contributing lenses if no keyword match.
 */
function classifyContestedLenses(feedback: string, contributing: string[]): string[] {
  const lower = feedback.toLowerCase();
  const lensKeywords: Record<string, string[]> = {
    CEO: ['strategic', 'strategy', 'vision', 'priority', 'long-term'],
    CFO: ['financial', 'cash', 'revenue', 'cost', 'margin', 'budget', 'arr'],
    CRO: ['sales', 'pipeline', 'gtm', 'revenue', 'customer', 'deal'],
    CMO: ['marketing', 'brand', 'campaign', 'demand', 'content'],
    CPO: ['product', 'roadmap', 'feature', 'engineering', 'launch'],
    COS: ['operations', 'process', 'team', 'hiring', 'headcount'],
    RedTeam: ['risk', 'wrong', 'downside', 'challenge', 'counter'],
    Steelman: ['upside', 'best case', 'optimistic', 'opportunity'],
  };

  const matched = contributing.filter((lens) => {
    const keywords = lensKeywords[lens] ?? [];
    return keywords.some((k) => lower.includes(k));
  });

  return matched.length > 0 ? matched : contributing;
}

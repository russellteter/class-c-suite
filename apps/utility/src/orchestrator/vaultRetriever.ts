// apps/utility/src/orchestrator/vaultRetriever.ts
// Source: tasks/V1_TARGET.md C2 (provable live-vault grounding — THE edge); Phase 0(a) spike
//         scripts/vault-retriever-spike.mjs (signed off by Russell 2026-06-01).
//
// In-process retriever over the live Obsidian "Business Planning" vault (*.md). Ranks notes by
// BM25 relevance x recency and packages the top-K as ContextDocuments the 6 lenses ground on + cite,
// plus a plain-text "Vault context used (with dates)" provenance block built from the SAME ranked set
// (no re-query — what the lenses received IS what the provenance reports; C5's judge depends on this).
//
// This is the GENERALIZATION of groundingContext.buildCashLeverGrounding: that builder grounds the
// cash playbook on one xlsx; this grounds an arbitrary strategic decision on the most relevant + most
// current vault notes. It NEVER fabricates — an empty/zero-hit corpus returns [] and the lenses degrade
// honestly (low confidence / UNKNOWN), exactly like the cash builder.
//
// Algorithm is a faithful port of the Phase-0(a) spike (same STOP set, BM25 k1/b, title double-weight,
// recency halflife, archive penalty). The port-fidelity gate (scripts/vault-retriever-fidelity.mjs)
// diffs this module's top-8 against the spike output Russell signed off; a drift is a regression.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';
import { homedir } from 'node:os';
import type { ContextDoc } from './groundingContext.js';
import { createLogger } from '../logger.js';

const log = createLogger();

export const DEFAULT_HALFLIFE_DAYS = 120;
export const DEFAULT_TOP_K = 8;
const MAX_CHARS_PER_NOTE = 2000; // per-note grounding excerpt cap (×K×6 lenses — keep the budget sane)

function defaultVaultDir(): string {
  return process.env.VAULT_PATH ?? join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');
}

// Stop-word set — identical to the signed-off spike.
const STOP = new Set(
  ('a an the of to in on for and or but with at by from as is are was were be been being this that ' +
    'it its we our you your i my they their he she them out up down über into over under not no do does how what which ' +
    'who whom whose when where why all any can will would should could about more most some such than then there here').split(' '),
);

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length >= 3 && !STOP.has(t));
}

function walk(dir: string, acc: string[] = []): string[] {
  // Cast away the @types/node Dirent<NonSharedBuffer> generic — withFileTypes returns string names here.
  let entries: Array<{ name: string; isDirectory(): boolean }>;
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as unknown as Array<{ name: string; isDirectory(): boolean }>;
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (extname(e.name) === '.md') acc.push(p);
  }
  return acc;
}

function noteDate(path: string, body: string): Date {
  // 1) date in filename  2) frontmatter date/last-updated/updated/created  3) mtime  4) epoch floor
  const fn = basename(path).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (fn) return new Date(`${fn[1]}-${fn[2]}-${fn[3]}`);
  const fm = body.slice(0, 600).match(/(?:date|last-updated|updated|created):\s*['"]?(\d{4}-\d{2}-\d{2})/i);
  if (fm) return new Date(fm[1]);
  try {
    return statSync(path).mtime;
  } catch {
    return new Date('2020-01-01');
  }
}

function noteTitle(path: string, body: string): string {
  const h1 = body.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : basename(path, '.md').replace(/[_-]+/g, ' ');
}

export interface RankedNote {
  /** Vault-relative path, e.g. investigations/go-forward-org-structure.md */
  path: string;
  title: string;
  date: Date;
  /** BM25 relevance (unweighted by recency). */
  rel: number;
  /** Recency multiplier in (0,1], 1.0 = today. */
  rec: number;
  /** Final rank score = rel × (0.4 + 0.6·rec) × archivePenalty. */
  score: number;
  archived: boolean;
  /** Full note body (for excerpting into a ContextDoc). */
  body: string;
}

interface IndexedDoc {
  path: string;
  title: string;
  len: number;
  tf: Record<string, number>;
  date: Date;
  archived: boolean;
  body: string;
}

export interface RankOptions {
  topK?: number;
  /** "Now" for the recency calc. Defaults to the real current date; the fidelity gate pins 2026-06-01. */
  today?: Date;
  halflifeDays?: number;
}

/**
 * Rank the vault's *.md corpus for a query by BM25 relevance × recency. Faithful port of the
 * Phase-0(a) spike. Returns the top-K notes (rel > 0), most relevant-and-current first.
 */
export function rankVaultNotes(query: string, vaultDir: string = defaultVaultDir(), opts: RankOptions = {}): RankedNote[] {
  const topK = opts.topK ?? DEFAULT_TOP_K;
  const today = opts.today ?? new Date();
  const halflife = opts.halflifeDays ?? DEFAULT_HALFLIFE_DAYS;

  const files = walk(vaultDir);
  if (files.length === 0) return [];

  const docs: IndexedDoc[] = files.map((p) => {
    let body = '';
    try {
      body = readFileSync(p, 'utf8');
    } catch {
      /* unreadable — index as empty */
    }
    const t = noteTitle(p, body);
    const toks = tokenize(t + ' ' + t + ' ' + body); // title double-weighted (same as spike)
    const tf: Record<string, number> = {};
    for (const w of toks) tf[w] = (tf[w] || 0) + 1;
    return {
      path: relative(vaultDir, p),
      title: t,
      len: toks.length,
      tf,
      date: noteDate(p, body),
      archived: p.includes('/_archive/'),
      body,
    };
  });

  const N = docs.length;
  const avgdl = docs.reduce((s, d) => s + d.len, 0) / N || 1;
  const df: Record<string, number> = {};
  for (const d of docs) for (const w of Object.keys(d.tf)) df[w] = (df[w] || 0) + 1;
  const idf = (w: string): number => Math.log(1 + (N - (df[w] || 0) + 0.5) / ((df[w] || 0) + 0.5));
  const k1 = 1.5;
  const b = 0.75;
  const bm25 = (qToks: string[], d: IndexedDoc): number => {
    let s = 0;
    for (const w of qToks) {
      const f = d.tf[w] || 0;
      if (!f) continue;
      s += idf(w) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / avgdl));
    }
    return s;
  };
  const recency = (d: IndexedDoc): number => {
    const age = Math.max(0, (today.getTime() - d.date.getTime()) / 86_400_000);
    return Math.exp(-age / halflife);
  };

  const q = tokenize(query);
  return docs
    .map((d) => {
      const rel = bm25(q, d);
      const rec = recency(d);
      const archPenalty = d.archived ? 0.35 : 1;
      return { d, rel, rec, score: rel * (0.4 + 0.6 * rec) * archPenalty };
    })
    .filter((x) => x.rel > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, topK)
    .map((x) => ({
      path: x.d.path,
      title: x.d.title,
      date: x.d.date,
      rel: x.rel,
      rec: x.rec,
      score: x.score,
      archived: x.d.archived,
      body: x.d.body,
    }));
}

// Prior C-suite lens/role memos in the vault (e.g. investigations/.../round2_pass2_cfo.md, pass2_coo.md,
// or any note titled "<role> Lens"). Russell's Phase-0(a) instruction: keep these as prior-art context,
// NOT gospel — label them so a fresh 6-lens run re-examines rather than echoes its own past conclusions.
const PRIOR_LENS_PATH = /pass\d*[_-]?(ceo|cfo|cro|cmo|cpo|cos|coo)\b/i;
function isPriorLensMemo(note: RankedNote): boolean {
  return PRIOR_LENS_PATH.test(note.path) || /\blens\b/i.test(note.title);
}

function excerpt(body: string, max: number): string {
  const cleaned = body.replace(/^---[\s\S]*?---\s*/, '').trim(); // drop leading frontmatter block
  return cleaned.length > max ? cleaned.slice(0, max).trimEnd() + '\n…[note truncated]' : cleaned;
}

function slug(path: string): string {
  return path.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'vault-note';
}

/** ISO YYYY-MM-DD for a note's resolved date. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Convert a ranked note into a grounding ContextDocument the lenses receive + cite. The content carries
 * the note's path + date inline (date-aware grounding) and, for prior lens/role memos, an explicit
 * "re-examine, do not restate" label (Russell's prior-art-not-gospel rule).
 */
export function noteToContextDoc(note: RankedNote): ContextDoc {
  const date = isoDate(note.date);
  const priorLabel = isPriorLensMemo(note)
    ? '[PRIOR C-SUITE ANALYSIS — treat as prior-art to re-examine and pressure-test, NOT a conclusion to restate.]\n'
    : '';
  const header = `Vault note: ${note.path}  ·  last updated ${date}`;
  return {
    id: slug(note.path),
    title: note.title,
    content: `${priorLabel}${header}\n\n${excerpt(note.body, MAX_CHARS_PER_NOTE)}`,
    source: `${note.path} · ${date}`,
  };
}

export interface VaultGrounding {
  contextDocuments: ContextDoc[];
  notes: RankedNote[];
}

/**
 * Build the vault grounding for an arbitrary strategic decision: top-K relevant+current notes as
 * ContextDocuments. Returns { contextDocuments:[], notes:[] } (honest degrade) when the corpus is empty
 * or nothing matches — callers MUST treat [] as "ungrounded" and never block the run on it.
 */
export function buildVaultGrounding(
  query: string,
  vaultDir: string = defaultVaultDir(),
  opts: RankOptions = {},
): VaultGrounding {
  const notes = rankVaultNotes(query, vaultDir, opts);
  if (notes.length === 0) {
    log.warn({ message: `vault grounding: 0 notes matched query in ${vaultDir} — lenses run ungrounded (honest UNKNOWN)` });
    return { contextDocuments: [], notes: [] };
  }
  log.info({
    message: `vault grounding: top ${notes.length} of ${query.length}-char query → contextDocuments; lead note ${notes[0].path} (${isoDate(notes[0].date)})`,
  });
  return { contextDocuments: notes.map(noteToContextDoc), notes };
}

/**
 * Stable, short, within-run-unique source id for the i-th ranked note (0-based). This is BOTH the
 * tool_calls.source_id and the [^token] click-badge text MemoViewer renders, so it must stay short
 * (the badge prints the raw token) and index-based (the org corpus grounds on two different
 * context_bundle.md — a path/basename token would collide; the rank index never does). Run-scoping
 * (handlers resolve WHERE run_id = ? AND source_id = ?) makes vault-N unique across runs.
 */
export function vaultSourceId(index: number): string {
  return `vault-${index + 1}`;
}

/** A tool_calls row recording one injected vault note (shape compatible with db.insertToolCall). */
export interface VaultRetrievalRow {
  call_id: string;
  run_id: string;
  invocation_id: string;
  agent_role: string;
  tool_name: string;
  args_json: string;
  result_json: string;
  source_id: string;
}

/**
 * Build the `vault.retrieve` tool_calls rows that record each injected note as evidence — the
 * deterministic half of the evidence chain (C4 render / PRD "click any source → see the result").
 * The live strategic path wrote ZERO tool_calls before this; these rows light up both the click panel
 * (MemoViewer 'tool-call:get') and the Verifier audit trail (playbookVerifier reads tool_calls). The
 * source_id matches the [^vault-N] marker renderVaultProvenance emits for the SAME note (same order),
 * so a click never resolves to the wrong note. result_json carries path/title/date/excerpt — exactly
 * what grounded the memo (no re-query; C5's judge depends on provenance == what the lenses received).
 */
export function buildVaultRetrievalRows(runId: string, query: string, notes: RankedNote[]): VaultRetrievalRow[] {
  const invocationId = `${runId}-Retriever`;
  return notes.map((n, i) => ({
    call_id: `${runId}-vaultret-${i + 1}`,
    run_id: runId,
    invocation_id: invocationId,
    agent_role: 'Retriever',
    tool_name: 'vault.retrieve',
    args_json: JSON.stringify({ query, rank: i + 1 }),
    result_json: JSON.stringify({
      path: n.path,
      title: n.title,
      date: isoDate(n.date),
      score: Number(n.score.toFixed(4)),
      excerpt: excerpt(n.body, MAX_CHARS_PER_NOTE),
    }),
    source_id: vaultSourceId(i),
  }));
}

/**
 * Render the "Vault context used (with dates)" provenance block appended to the memo. Built from the
 * SAME ranked notes the lenses received — what grounded the memo IS what is reported (C5 judge). Each
 * line ends with a [^vault-N] marker MemoViewer.parseMemoMarkdown turns into a clickable badge that
 * resolves (run-scoped) to the matching vault.retrieve tool_call (the note's excerpt). Otherwise uses
 * only headers + plain-text lines (parseMemoMarkdown renders h1/h2/h3 + text + [^id]; bold/lists/-
 * are NOT special-cased and would show as literal characters).
 */
export function renderVaultProvenance(notes: RankedNote[]): string {
  const lines = [
    '## Vault context used',
    `These ${notes.length} live notes from the Business Planning vault grounded this analysis (most relevant + current first). Click a source to see the excerpt that grounded it:`,
    '',
  ];
  notes.forEach((n, i) => {
    lines.push(`${i + 1}. ${n.title}  —  last updated ${isoDate(n.date)}  —  ${n.path} [^${vaultSourceId(i)}]`);
  });
  return lines.join('\n');
}

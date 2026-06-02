// Diagnostic: call generateHandoffBrief ONCE, timed, isolated from UI + IPC + double-dispatch.
// Settles the advisor's "stuck vs slow" question. STUB_MODE=live, real vault, token from .env.local.
// ~2 min → gen is healthy (in-app failure is the harness/process confound). Hangs/8-min-timeout → gen is broken.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const REAL_VAULT = join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

// Load CLAUDE_CODE_OAUTH_TOKEN (+ any other keys) from apps/main/.env.local
const envRaw = readFileSync(join(root, 'apps', 'main', '.env.local'), 'utf8');
for (const line of envRaw.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && m[2]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
process.env.STUB_MODE = 'live';
process.env.VAULT_PATH = REAL_VAULT;
console.log('[standalone] STUB_MODE=live token=' + (process.env.CLAUDE_CODE_OAUTH_TOKEN ? 'present' : 'MISSING') + ' vault=' + REAL_VAULT);

// Import AFTER env is set (runner reads VAULT_PATH at module-load).
const { generateHandoffBrief } = await import(join(root, 'apps', 'utility', 'dist', 'agents', 'handoff', 'index.js'));

// Build the SAME input shape index.ts:195-211 builds for the org memo.
const originPath = 'memos/2026-06-01-open_qa-c902b7c6.md';
const raw = readFileSync(join(REAL_VAULT, originPath), 'utf8');
let bodyMarkdown = raw, frontmatter = {}, title = '2026-06-01-open_qa-c902b7c6';
const fm = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
if (fm) { bodyMarkdown = fm[2] ?? ''; try { const y = await import('js-yaml'); const p = y.load(fm[1]); if (p && typeof p === 'object') { frontmatter = p; if (typeof p.title === 'string') title = p.title; } } catch {} }

const input = {
  origin: { type: 'memo', id: '2026-06-01-open_qa-c902b7c6', path: originPath, title, bodyMarkdown, frontmatter },
  runContext: { runId: 'c902b7c6-3697-4093-95ad-f972d1b4e772', playbookId: 'open_qa', stakeholdersOfInterest: [], workstreamsOfInterest: [] },
};
console.log('[standalone] origin body=' + bodyMarkdown.length + ' chars, title="' + title + '" — invoking generateHandoffBrief (single call)…');

const t0 = process.hrtime.bigint();
try {
  const brief = await generateHandoffBrief(input);
  const secs = Number(process.hrtime.bigint() - t0) / 1e9;
  console.log(`\n=== BRIEF GENERATED in ${secs.toFixed(1)}s ===`);
  console.log('filename:          ' + (brief.filename ?? '(none top-level)'));
  console.log('frontmatter.filename: ' + (brief.frontmatter?.filename ?? '(none)'));
  console.log('bodyMarkdown:      ' + (brief.bodyMarkdown?.length ?? 0) + ' chars');
  console.log('top-level keys:    ' + Object.keys(brief).join(', '));
  console.log('\n----- bodyMarkdown (first 800) -----\n' + (brief.bodyMarkdown ?? '').slice(0, 800));
  process.exit(0);
} catch (e) {
  const secs = Number(process.hrtime.bigint() - t0) / 1e9;
  console.log(`\n=== GEN THREW after ${secs.toFixed(1)}s ===\n` + (e?.stack || String(e)));
  process.exit(1);
}

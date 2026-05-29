// LIVE Synthesizer isolation proof (O3): invoke the REAL Synthesizer (claude-sonnet-4-6) with a
// realistic 6-lens input — the actual lens outputs from the most recent generic-path (cash_lever)
// run in runtime.db — and validate the result against the strict SynthesizerOutputSchema (the same
// schema onSubagentStop enforces). This proves the Synthesizer PROMPT produces schema-valid output
// under real inference, without re-running 6 sequential lens calls (~5 min) through the full app.
//
// Why isolation: the generic run-loop dispatches the 6 lenses SEQUENTIALLY, so a full-app cash_lever
// run spends most of the harness window on lenses and the Synthesizer gets killed by the 540s ceiling
// before completing — a latency artifact, not a prompt defect. This harness skips straight to the
// Synthesizer with real lens context. Mirrors live-verifier-isolation.mjs.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

for (const line of readFileSync(join(root, 'apps', 'main', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  process.env[m[1]] = v;
}
delete process.env.ANTHROPIC_API_KEY;

const DB = join(homedir(), 'Library', 'Application Support', '@c-suite', 'main', 'runtime.db');
const dbq = (sql) => execFileSync('sqlite3', [DB, sql], { encoding: 'utf8' }).trim();

// Most recent generic-path run with 6 completed lenses → its real lens outputs.
const runId = dbq(`SELECT run_id FROM runs WHERE playbook='cash_lever' ORDER BY started_at DESC LIMIT 1;`);
const question = dbq(`SELECT question FROM runs WHERE run_id='${runId}';`) || 'Cash lever vs trough: which lever moves the W30 cash trough most?';
const LENS_ROLES = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'];
const lensOutputs = {};
for (const role of LENS_ROLES) {
  const raw = dbq(`SELECT structured_output_json FROM agent_invocations WHERE run_id='${runId}' AND agent_role='${role}' AND status='completed';`);
  if (!raw) { console.error(`[synth] MISSING completed lens output for ${role} in run ${runId}`); process.exit(1); }
  lensOutputs[role] = JSON.parse(raw);
}
console.log(`[synth] seeded from run ${runId} — 6 real lens outputs (${LENS_ROLES.join(', ')})`);

const { RealClaudeClient, ClaudeOutputParseError } = await import(join(root, 'apps', 'utility', 'dist', 'agents', 'realClaudeClient.js'));
const { SynthesizerDefinition } = await import(join(root, 'apps', 'utility', 'dist', 'agents', 'index.js'));
const systemPrompt = readFileSync(join(root, 'apps', 'utility', 'dist', 'prompts', 'Synthesizer.prompt.md'), 'utf8');

const context = { runId, question, playbook: 'cash_lever', lensOutputs };

console.log('[synth] invoking REAL Synthesizer (claude-sonnet-4-6) with 6-lens context…');
const t0 = Date.now();
let raw;
try {
  const env = await new RealClaudeClient().invoke({ role: 'Synthesizer', systemPrompt }, context);
  raw = env.structuredOutput;
} catch (err) {
  if (err instanceof ClaudeOutputParseError || err?.code === 'CLAUDE_OUTPUT_PARSE_ERROR') {
    console.error('[synth] PARSE FAILED after', Date.now() - t0, 'ms. Raw (first 800):\n' + String(err.raw).slice(0, 800));
  } else {
    console.error('[synth] OTHER ERROR:', err?.stack || String(err));
  }
  process.exit(2);
}

// Inject role + runId exactly as dispatchSynthesizer does before onSubagentStop, then validate
// against the SAME schema onSubagentStop uses (SynthesizerDefinition.outputSchema).
const injected = raw && typeof raw === 'object' ? { ...raw, role: 'Synthesizer', runId } : raw;
const parsed = SynthesizerDefinition.outputSchema.safeParse(injected);

console.log(`[synth] model returned in ${Date.now() - t0} ms`);
if (!parsed.success) {
  console.error('[synth] SCHEMA VALIDATION FAILED — SynthesizerOutputSchema rejected the output:');
  console.error(JSON.stringify(parsed.error.issues, null, 2).slice(0, 1500));
  process.exit(3);
}

const d = parsed.data;
const memo = d.memoMarkdown || '';
const requiredSections = ['Executive Summary', 'Reconciled Position', 'Claims and Evidence', 'Risks', 'Open Questions', 'Falsifiers'];
const missingSections = requiredSections.filter((s) => !memo.includes(s));
// Fabrication scan: hardcoded Class entities/numbers presented as fact (DOCTRINE #1).
const fab = (memo + ' ' + (d.executiveSummary || '') + ' ' + (d.keyDecisions || []).join(' '))
  .match(/Barclays|PIK\b|\$\s?[0-9]|[0-9]+\.[0-9]+\s?M\b|111,?766|July board/gi) || [];

console.log('[synth] === SCHEMA VALID ===');
console.log(`[synth] memoMarkdown: ${memo.length} chars | executiveSummary: ${(d.executiveSummary||'').length} chars`);
console.log(`[synth] keyDecisions: ${d.keyDecisions.length} | citations: ${d.citations.length} | positionMetadata: ${d.positionMetadata.length} | proposedWritebacks: ${d.proposedWritebacks.length}`);
console.log(`[synth] memo sections present: ${requiredSections.length - missingSections.length}/${requiredSections.length}${missingSections.length ? ' MISSING: ' + missingSections.join(', ') : ''}`);
console.log(`[synth] keyDecisions: ${JSON.stringify(d.keyDecisions).slice(0, 300)}`);
console.log(`[synth] execSummary: ${(d.executiveSummary||'').slice(0, 280)}`);
console.log(`[synth] fabrication scan (hardcoded Class entities/numbers): ${fab.length === 0 ? 'CLEAN' : 'FOUND ' + JSON.stringify(fab)}`);

const ok = missingSections.length === 0 && fab.length === 0;
console.log(ok ? '\n=== SYNTHESIZER LIVE PROOF PASSED ===' : '\n=== SYNTHESIZER LIVE PROOF FAILED (sections/fabrication) ===');
process.exit(ok ? 0 : 4);

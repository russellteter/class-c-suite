// Port-fidelity gate (durable). Proves the TS retriever (apps/utility/src/orchestrator/vaultRetriever.ts)
// reproduces the signed-off Phase-0(a) spike (scripts/vault-retriever-spike.mjs) EXACTLY — same notes,
// same order — for BOTH real decisions, using the spike's queries + TODAY=2026-06-01. It diffs against a
// LIVE spike subprocess (not a frozen list) so the gate does not rot as Russell's vault grows; a drift
// here is a genuine ALGORITHM divergence, not a vault change. Run: npx tsx scripts/vault-retriever-fidelity.ts
import { execFileSync } from 'node:child_process';
import { rankVaultNotes } from '../apps/utility/src/orchestrator/vaultRetriever.js';
import { join } from 'node:path';
import { homedir } from 'node:os';

const VAULT = join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');
const today = new Date('2026-06-01'); // matches the spike's hardcoded TODAY

// Exact spike query strings (scripts/vault-retriever-spike.mjs:102,105).
const Q1 = 'org chart company organizational structure reporting lines GTM revenue AM account management sales org restructuring headcount roles who does what teams reorg leadership';
const Q2 = 'expense reduction cost cut targets amount EBITDA positive cash flow positive solvency runway burn rate revenue model minimum goals 2026 2027 budget reductions';

// Run the spike and parse its top-8 vault-relative paths per decision (lines like "    <path>  (rel ...").
function spikePaths(): { d1: string[]; d2: string[] } {
  const out = execFileSync('node', ['scripts/vault-retriever-spike.mjs'], { encoding: 'utf8' });
  const sections = out.split(/=+\s*DECISION\s*(\d)/);
  const grab = (block: string): string[] =>
    [...block.matchAll(/^\s+(\S.*?\.md)\s+\(rel /gm)].map((m) => m[1].trim());
  // sections = [pre, '1', block1, '2', block2]
  return { d1: grab(sections[2] ?? ''), d2: grab(sections[4] ?? '') };
}

const spike = spikePaths();
const ts1 = rankVaultNotes(Q1, VAULT, { today, topK: 8 }).map((n) => n.path);
const ts2 = rankVaultNotes(Q2, VAULT, { today, topK: 8 }).map((n) => n.path);

let allPass = true;
for (const [label, ts, sp] of [['DECISION 1 — Org', ts1, spike.d1], ['DECISION 2 — Expenses', ts2, spike.d2]] as const) {
  const match = ts.length === sp.length && ts.length === 8 && ts.every((p, i) => p === sp[i]);
  console.log(`\n=== ${label} ===`);
  ts.forEach((p, i) => console.log(`${String(i + 1).padStart(2)}. ${p}${p === sp[i] ? '' : `   <-- spike: ${sp[i] ?? '(none)'}`}`));
  console.log(match ? 'FIDELITY: PASS (TS == live spike, top-8 in order)' : 'FIDELITY: FAIL (algorithm divergence)');
  allPass = allPass && match;
}
console.log(`\n${allPass ? 'ALL FIDELITY CHECKS PASS — TS port is byte-faithful to the signed-off spike.' : 'FIDELITY DRIFT — algorithm divergence; resolve before relying on grounding.'}`);
process.exit(allPass ? 0 : 1);

// Step-zero diagnostic for the live ClaudeOutputParseError: invoke the REAL Verifier
// (claude-opus-4-7, which preambles) with a representative verifier input and print the
// FULL raw model output (ClaudeOutputParseError.raw holds it untruncated). This reveals
// whether valid JSON follows the reasoning preamble (→ extract last block) or the output
// is all-prose / truncated (→ different fix). ~20s loop vs a 3.5-min UI run.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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

const { RealClaudeClient, ClaudeOutputParseError } = await import(join(root, 'apps', 'utility', 'dist', 'agents', 'realClaudeClient.js'));
const systemPrompt = readFileSync(join(root, 'apps', 'utility', 'dist', 'prompts', 'Verifier.prompt.md'), 'utf8');

// FAITHFUL mirror of runVerifier's userMessage (verifier-runner.ts:105-114) wrapped exactly as
// StubVerifierInvoker passes it (verifier-runner.ts:62-69): {question, playbook, runId, userMessage}.
// Simulates a NON-ADVERSARIAL playbook (stakeholder_1_1): every contract input present EXCEPT
// red_team_output / steelman_output (absent — single-lens playbooks produce no adversarial stage).
// The goal: read the Verifier's `missing[]` array to learn EXACTLY what it flags as the violation.
const userMessage = JSON.stringify({
  memo_markdown:
    '# Stakeholder 1:1 Prep: Jane Doe (VP Engineering)\n\n## COS Summary\nJane prioritizes platform reliability and is sensitive to roadmap churn; she responds well to sequencing commitments.\n\n## Key Positions\n- Reliability investment should precede new feature commitments [^p1]\n\n## Sources\n- [^p1]: stakeholder file (jane-doe.md)',
  lens_outputs: [
    {
      role: 'COS',
      summary: 'Jane prioritizes reliability; wary of roadmap churn.',
      positions: [{ claim: 'Reliability before features', confidence: 0.6, citations: [{ id: 'p1', source: 'stakeholders/jane-doe.md', text: 'reliability focus' }] }],
      citations: [{ id: 'p1', source: 'stakeholders/jane-doe.md', text: 'reliability focus' }],
      confidence: 0.6,
    },
  ],
  tool_call_audit_trail: [],
  position_metadata: [],
  // red_team_output / steelman_output INTENTIONALLY ABSENT (non-adversarial playbook).
  run_playbook: 'stakeholder_1_1',
  run_question: 'Prep for my 1:1 with Jane Doe',
});
const context = { question: 'Prep for my 1:1 with Jane Doe', playbook: 'stakeholder_1_1', runId: 'iso-nonadversarial', userMessage };

console.log('[verif] invoking REAL Verifier (claude-opus-4-7) — faithful non-adversarial mirror (no red-team/steelman)…');
const t0 = Date.now();
try {
  const out = await new RealClaudeClient().invoke({ role: 'Verifier', systemPrompt }, context);
  console.log('[verif] invoke returned in', Date.now() - t0, 'ms.');
  const so = out.structuredOutput;
  const keys = so && typeof so === 'object' ? Object.keys(so) : [];
  const expected = ['rigor_score', 'ship_status', 'dimensions', 'failure_reasons', 'verifier_notes'];
  const hasAll = expected.every((k) => keys.includes(k));
  console.log('[verif] extracted top-level keys:', JSON.stringify(keys));
  if (so && typeof so === 'object' && 'error' in so) {
    console.log('[verif] *** CONTRACT-VIOLATION RESPONSE *** error:', so.error, '| missing:', JSON.stringify(so.missing));
  }
  console.log('[verif] matches VerifierOutput shape (has all 5 required keys):', hasAll, hasAll ? '→ scenario OK/B-ok' : '→ scenario A (parser grabbed wrong object) OR B (wrong shape)');
  console.log('[verif] extracted object:', JSON.stringify(so, null, 2).slice(0, 2500));
  process.exit(hasAll ? 0 : 3);
} catch (err) {
  if (err instanceof ClaudeOutputParseError || err?.code === 'CLAUDE_OUTPUT_PARSE_ERROR') {
    const raw = err.raw ?? '';
    console.log('[verif] PARSE FAILED after', Date.now() - t0, 'ms. FULL raw output (' + raw.length + ' chars):');
    console.log('────────────────────────────────────────────────────────');
    console.log(raw);
    console.log('────────────────────────────────────────────────────────');
    // Quick structural probe: is there a fenced/braced JSON object in there?
    const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/);
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    console.log('[verif] probe: fenced block present:', Boolean(fenced), '| first { at', firstBrace, '| last } at', lastBrace);
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const candidate = raw.slice(firstBrace, lastBrace + 1);
      try { JSON.parse(candidate); console.log('[verif] probe: first{..}last} IS valid JSON, len', candidate.length); }
      catch { console.log('[verif] probe: first{..}last} NOT directly valid (needs last-balanced-object scan)'); }
    }
    process.exit(2);
  }
  console.error('[verif] OTHER ERROR:', err?.stack || String(err));
  process.exit(1);
}

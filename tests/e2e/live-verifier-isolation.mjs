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

// Representative pre_mortem (adversarial-only) verifier input: empty arrays + a draft to grade.
const context = {
  playbook: 'pre_mortem',
  stamp: 'ADVERSARIAL ONLY — no six-lens fan-out',
  memo_draft:
    '# Pre-mortem: Q3 Platform Migration\n\n## Top failure modes\n1. Capacity: 3 workstreams already at-risk; migration competes for the same 2 senior engineers.\n2. Org friction: data team was not consulted on the cutover window.\n\n## De-risking\n- Sequence migration into the natural pause points in the next 6 weeks.\n- Pre-brief the data team before locking the window.',
  lens_outputs: [],
  tool_call_audit_trail: [],
  position_metadata: [],
};

console.log('[verif] invoking REAL Verifier (claude-opus-4-7) with representative input…');
const t0 = Date.now();
try {
  const out = await new RealClaudeClient().invoke({ role: 'Verifier', systemPrompt }, context);
  console.log('[verif] PARSED OK in', Date.now() - t0, 'ms — strict JSON.parse succeeded.');
  console.log('[verif] structuredOutput:', JSON.stringify(out.structuredOutput).slice(0, 400));
  process.exit(0);
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

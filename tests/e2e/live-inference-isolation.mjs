// Isolation proof: does the REAL Claude Agent SDK query() produce live inference
// with CLAUDE_CODE_OAUTH_TOKEN (Max subscription), independent of the orchestrator,
// the UI, MCP, and better-sqlite3. This de-risks the single riskiest Phase 3 unknown
// before wiring the full app round-trip.
//
// Loads apps/main/.env.local for the token, strips ANTHROPIC_API_KEY (the locked
// "Max-subscription only" constraint), invokes RealClaudeClient with a trivial
// JSON-output agent definition, and prints the structured output + token usage.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

// 1) Load .env.local → process.env (token in; api-key out).
const envFile = readFileSync(join(root, 'apps', 'main', '.env.local'), 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let val = m[2].trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[m[1]] = val;
}
delete process.env.ANTHROPIC_API_KEY;   // locked constraint: never pay-per-token
console.log('[iso] OAuth token present:', Boolean(process.env.CLAUDE_CODE_OAUTH_TOKEN), '| len:', (process.env.CLAUDE_CODE_OAUTH_TOKEN ?? '').length);
console.log('[iso] ANTHROPIC_API_KEY stripped:', !process.env.ANTHROPIC_API_KEY);

// 2) Import the compiled real client.
const { RealClaudeClient } = await import(join(root, 'apps', 'utility', 'dist', 'agents', 'realClaudeClient.js'));

// 3) Trivial agent definition that must return strict JSON (the client JSON.parses output).
const definition = {
  role: 'Synthesizer',
  systemPrompt:
    'You are a test harness. Respond with ONLY a JSON object, no prose, no code fences: ' +
    '{"answer": "<one short sentence>", "confident": true}. Nothing else.',
};
const context = { question: 'In one short sentence: what is the capital of France?' };

console.log('[iso] invoking RealClaudeClient.invoke() — real Agent SDK query()…');
const t0 = Date.now();
try {
  const client = new RealClaudeClient();
  const out = await client.invoke(definition, context);
  const ms = Date.now() - t0;
  console.log('[iso] PASS — live inference returned in', ms, 'ms');
  console.log('[iso] structuredOutput:', JSON.stringify(out.structuredOutput));
  console.log('[iso] tokensIn:', out.tokensIn, '| tokensOut:', out.tokensOut);
  process.exit(out.tokensOut > 0 ? 0 : 2);
} catch (err) {
  console.error('[iso] FAILED:', err?.stack || String(err));
  process.exit(1);
}

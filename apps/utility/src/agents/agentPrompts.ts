// apps/utility/src/agents/agentPrompts.ts
// O3: loads the real system prompts for the generic six-lens path + Synthesizer at dispatch
// time (mirrors verifier-runner.ts and pre-mortem/index.ts — call-time readFileSync, NOT a
// module-init load, so the widely-imported registry stays free of fs side effects and the
// replay test path never touches disk). The .md files are copied into dist/prompts by
// scripts/copy-utility-assets.mjs, so the same `../prompts/<file>` resolution works from both
// src (vitest) and dist (production utilityProcess).
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const _dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

// role → prompt filename. Only the roles the live/record path actually dispatches:
// the 6 strategic lenses (via dispatchLens) and the Synthesizer (via dispatchSynthesizer).
// Verifier/Handoff/pre-mortem RedTeam+Steelman load their own prompts in their own runners.
const PROMPT_FILES: Readonly<Record<string, string>> = {
  CEO: 'ceo.prompt.md',
  CFO: 'cfo.prompt.md',
  CRO: 'cro.prompt.md',
  CMO: 'cmo.prompt.md',
  CPO: 'cpo.prompt.md',
  COS: 'cos.prompt.md',
  Synthesizer: 'Synthesizer.prompt.md',
};

/**
 * Returns the system-prompt content for a dispatched agent role. Fails loud if the role has no
 * mapped prompt file or the file is missing (a missing prompt must never silently degrade to a
 * stub — that would ship fabricated-quality output under a downstream CLEAN stamp, DOCTRINE #1).
 */
export function loadAgentPrompt(role: string): string {
  const file = PROMPT_FILES[role];
  if (!file) {
    throw new Error(`loadAgentPrompt: no prompt file mapped for role '${role}'`);
  }
  return readFileSync(join(_dirname, '../prompts', file), 'utf8');
}

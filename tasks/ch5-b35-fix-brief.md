# Ch.5 B35 Fix — Implement Real Verifier Execution Path

## Your role

Fix-Integration engineer for the single most load-bearing finding in Phase 1: B35. Currently `apps/utility/src/agents/verifier-runner.js` does NOT exist; `apps/utility/src/orchestrator/run-loop.ts:109-114` hardcodes `verifier.pass({ rigorScore: 85 })`. The Verifier — primary quality gate per PRD §5 — never executes.

Goal completion criterion (g) requires "real run produced rigor-scored memo." This task closes that gap.

You operate under DOCTRINE (10 laws). DOCTRINE law #2 — verify before claiming done.

## Required reads

1. `docs/decisions/0004-ch3-runtime-spine.md` §2.10 (VerifierDefinition) + §5 (VerifierInput contract) + §3 (SDK hooks).
2. `docs/decisions/0005-ch4-prompts-rigor.md` §4 (Verifier prompt) + §6 (rigorScore).
3. `apps/utility/src/orchestrator/verifierInput.ts` — `buildVerifierInput()` already exists; consume its output.
4. `apps/utility/src/prompts/Verifier.prompt.md` — the prompt to send.
5. `packages/shared-types/src/verifier-input.ts` + `packages/shared-types/src/verifier-output.ts` (or wherever `VerifierOutputSchema` lives).
6. `apps/utility/src/scoring/rigorScore.ts` — the pure function that computes the final score from VerifierOutput.
7. `apps/utility/src/orchestrator/run-loop.ts` lines 109-114 — the hardcoded path to replace.
8. `packages/stub-harness/src/stub.ts` — for STUB_MODE=replay in CI.
9. `tests/fixtures/lens-outputs/canary-run/Verifier.json` — existing canary fixture (use as one record-replay shape).

## Mission

### Section 1 — Implement `apps/utility/src/agents/verifier-runner.ts`

NOT `.js` — TypeScript. The Ultra-Review mentioned `.js`; that was the original architect spec naming. Use `.ts` consistent with rest of `apps/utility/src/`.

```typescript
// apps/utility/src/agents/verifier-runner.ts
import { z } from 'zod';
import type { VerifierInput } from '@c-suite/shared-types/verifier-input';
import { VerifierOutputSchema, type VerifierOutput } from '@c-suite/shared-types/verifier-output';
import { StubClaudeClient } from '@c-suite/stub-harness/stub';
import { readFileSync } from 'fs';
import { join } from 'path';

const VERIFIER_PROMPT_PATH = join(__dirname, '../prompts/Verifier.prompt.md');

export type RunVerifierOpts = {
  stubClient: StubClaudeClient;
  modelHint?: 'opus-4-7' | 'sonnet-4-6';
};

export async function runVerifier(
  input: VerifierInput,
  opts: RunVerifierOpts
): Promise<VerifierOutput> {
  const systemPrompt = readFileSync(VERIFIER_PROMPT_PATH, 'utf8');

  const userMessage = JSON.stringify({
    memo_markdown: input.memoMarkdown,
    lens_outputs: input.lensOutputs,
    tool_call_audit_trail: input.toolCallAuditTrail,
    position_metadata: input.positionMetadata,
    red_team_output: input.redTeamOutput,
    steelman_output: input.steelmanOutput,
    run_playbook: input.runPlaybook,
    run_question: input.runQuestion,
  });

  const sdkResponse = await opts.stubClient.invoke({
    role: 'Verifier',
    modelHint: opts.modelHint ?? 'opus-4-7',
    systemPrompt,
    userMessage,
  }, {
    // Stable hash key for STUB_MODE=replay
    runId: input.runId,
    role: 'Verifier',
    inputHash: hashInput(input),
  });

  // Parse via Zod (forced JSON contract per ADR-0005 §4)
  const parsed = VerifierOutputSchema.safeParse(sdkResponse);
  if (!parsed.success) {
    throw new VerifierOutputContractViolation(parsed.error);
  }
  return parsed.data;
}

class VerifierOutputContractViolation extends Error {
  constructor(public zodError: z.ZodError) {
    super(`Verifier returned malformed output: ${zodError.message}`);
    this.name = 'VerifierOutputContractViolation';
  }
}

function hashInput(input: VerifierInput): string {
  // Deterministic hash for stub-replay key. Avoid noisy fields.
  const stable = JSON.stringify({
    runPlaybook: input.runPlaybook,
    runQuestion: input.runQuestion,
    memoMarkdown: input.memoMarkdown,
    lensCount: input.lensOutputs.length,
  });
  return require('crypto').createHash('sha256').update(stable).digest('hex').slice(0, 16);
}
```

Adjust the StubClaudeClient call signature to match what `stub.ts` actually exposes. Inspect that file first.

### Section 2 — Wire into `run-loop.ts`

Replace lines 109-114 (the hardcoded `verifier.pass({ rigorScore: 85 })`):

```typescript
// BEFORE
const verifierResult = { passed: true, rigorScore: 85 };

// AFTER
import { runVerifier } from '../agents/verifier-runner';
import { rigorScore } from '../scoring/rigorScore';
import { buildVerifierInput } from './verifierInput';

const verifierInput = buildVerifierInput(runId);  // throws VerifierInputContractViolation if missing
const verifierOutput = await runVerifier(verifierInput, { stubClient });
const finalScore = rigorScore(verifierOutput);  // pure function aggregates the 5 dimensions
const passed = finalScore >= rigorThreshold(playbook);

const verifierResult = {
  passed,
  rigorScore: finalScore,
  shipStatus: shipStatus(finalScore, playbook),
  failureReasons: verifierOutput.failure_reasons,
};
```

Persist the full `VerifierOutput` to SQLite (insert into `verifier_outputs` table if it exists; if not, add a migration `004_verifier_outputs.sql`).

### Section 3 — Stub fixture for cash-lever happy path

`tests/fixtures/lens-outputs/cash-lever-run/Verifier.json`:

A realistic happy-path VerifierOutput for the cash-lever playbook. rigor_score around 85, ship_status: 'clean', non-empty falsifiers, all dimensions in their passing bands. Mark with `_comment: "Hand-authored happy-path fixture for cash-lever stub-harness e2e. Replace with STUB_MODE=record capture when SDK is wired."`

### Section 4 — End-to-end stub test (closes goal criterion g)

`tests/e2e/cash-lever-stub-e2e.spec.ts` (or activate the existing `tests/e2e/cash-lever-stub.spec.ts` if it's already scaffolded):

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

describe('Ch.5 AC-1 — cash-lever e2e (stub harness; closes criterion g)', () => {
  let tempVault: string;

  beforeEach(() => {
    tempVault = mkdtempSync(join(tmpdir(), 'cs-e2e-'));
    // init git
    spawnSync('git', ['-c', 'init.defaultBranch=main', 'init'], { cwd: tempVault });
    spawnSync('git', ['-c', 'user.email=test@local', '-c', 'user.name=test', 'commit', '--allow-empty', '-m', 'baseline'], { cwd: tempVault });
  });

  it('full cash-lever run produces a real rigor-scored memo in vault', async () => {
    // 1. Construct test orchestrator with STUB_MODE=replay against cash-lever fixtures
    // 2. Invoke the cash-lever playbook with the W30 trough question
    // 3. Wait for run completion (shipped-clean or shipped-draft state)
    // 4. Read the memo file from tempVault/memos/
    // 5. Assert: file exists, contains rigor_score in frontmatter (NOT 85; the real fixture value)
    // 6. Assert: memo body has [^source-id] citations
    // 7. Click-claim: queryToolCallBySourceId on one of those source-ids returns the tool_call row
    // 8. Assert: git log shows one commit per memo write with the c-suite: format
  });

  afterEach(() => {
    rmSync(tempVault, { recursive: true, force: true });
  });
});
```

The test may be necessarily aspirational if the full orchestrator dispatch path isn't ready for an in-process invocation. Get as far as you can; document what's still gap-blocking and surface to me. If you need to write a smaller "shape" test that exercises just `runVerifier()` against a fixture and confirms it returns a parseable VerifierOutput with a non-hardcoded score, that's an acceptable smaller win — note it in the return.

### Section 5 — Unit test for runVerifier itself

`tests/unit/verifier-runner.spec.ts`:

- Invoke `runVerifier()` with the canary VerifierInput against `STUB_MODE=replay` pointing at the canary Verifier.json fixture.
- Assert returned VerifierOutput has `ship_status: 'draft'`, `rigor_score < 70`, `claims_unverified` includes `$43M`.
- Invoke with a happy-path input + cash-lever fixture.
- Assert returned VerifierOutput parses cleanly + has expected ship_status.
- Invoke with a malformed stub response → assert `VerifierOutputContractViolation` thrown.

## Discipline

- Cite ADR sections + line numbers in commit messages.
- Atomic commits per section.
- `pnpm -r run typecheck` + `pnpm run test:unit` after each commit.
- Do NOT modify B36-B39 (Russell handles those).

## Exit criteria

- `apps/utility/src/agents/verifier-runner.ts` exists and exports `runVerifier`.
- `run-loop.ts:109-114` no longer hardcodes rigorScore.
- A stub-harness test produces a memo with a non-hardcoded rigor score derived from a real fixture.
- `pnpm run test:unit` — all earlier-chapter tests still green; new verifier-runner tests pass.
- BY-HAND: run the e2e or runVerifier shape test via `pnpm vitest run tests/<the-file>`, observe a real rigor_score in output (not literal 85).

After all clean: update `docs/reviews/ch5-audit-qa-report.md` AC-1 from NW → PASS with reference to the new test. Update `BLOCKERS.md` B35 status to MITIGATED. Update `.claude/project-state.json` current_phase to `phase-1-complete` (or specify what's left).

## Return

Under 600 words: files created/modified, key code shape, commit SHAs, final test summary, BY-HAND verification output (the actual rigor_score the test produced), B35 status, `tail -5 .git/auto-push.log`.

## Out of scope

- B36 (classifier fall-through) — Russell handles.
- B37 (stakeholder lens roster) — Russell handles.
- B38 (N=3 cap) — Russell handles.
- B39 (git-commit silent failure) — Russell handles.
- Real SDK invocation against Anthropic API — stub-harness only.
- Phase 2 work.

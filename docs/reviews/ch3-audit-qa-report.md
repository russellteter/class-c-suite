# Ch.3 Audit/QA Report — Independent Acceptance Verification

**Auditor:** EvidenceQA (Audit/QA agent, isolated from Build/Test per DOCTRINE law #7)
**Audit date:** 2026-05-27
**ADR under review:** `docs/decisions/0004-ch3-runtime-spine.md`
**Head commit reviewed:** `a1dc122` (ch3+ch4+ch5: pre-stage Audit/QA briefs)
**Test run (unit):** 783 passed / 14 failed (5 test files) / `pnpm run test:unit`, 2026-05-27
**Verdict: CHAPTER REOPEN — 0 PASS / 1 FAIL / 0 CONCERN / 9 NEEDS WORK**

---

## 1. Per-Criterion PASS/FAIL Table (ADR §8, 10 rows)

| # | Criterion | Implementing file(s) | Test(s) | Verdict | Evidence |
|---|-----------|----------------------|---------|---------|----------|
| AC-1 | E2E run-loop reaches `handoff` state via state-machine | `apps/utility/src/orchestrator/state-machine.ts` | `tests/unit/run-loop-e2e.spec.ts` | **NW** | Test file contains only `expect(true).toBe(true)` placeholder assertions. All 8 asserted "passes" are tautologies. No real state-machine traversal validated. |
| AC-2 | `buildLensContextBundleSchema('CFO').parse(bundleWithCROLeak)` throws containing `LensIsolationViolation` | `packages/shared-types/src/lens-context-bundle.ts` | `tests/unit/lens-isolation/cross-lens-leak.spec.ts` | **FAIL** | BY-HAND confirmed: schema strips unknown keys before `superRefine` runs (Zod v4.4.3). `findCrossLensLeaks` correctly identifies violations on raw objects but Zod never passes the foreign field to `superRefine`. See §2. |
| AC-3 | `buildVerifierInput()` throws `VerifierInputContractViolation` when Synthesizer row missing | `apps/utility/src/verifier-assembler.ts` | `tests/unit/verifier-contract.spec.ts` | **NW** | Test file: all assertions are `expect(true).toBe(true)` placeholders. Real assertions commented out with "Runtime ships" marker. Code-read confirms correct fail-closed logic exists in assembler but it is untested by live assertions. |
| AC-4 | Checkpoint-resume: crash mid-fan-out resumes from last `agent_invocations.completed_at` row | `apps/utility/src/orchestrator/hooks.ts` | `tests/unit/checkpoint-resume.spec.ts` | **NW** | Test file: all assertions are `expect(true).toBe(true)` placeholders. Hooks.ts `onSubagentStop` writes `output_json` before state transition per ADR §7.1 — code logic is sound but untested. |
| AC-5 | 12 AgentDefinitions compile: correct `role`, `model`, `toolAllowlist`, `outputSchema` | `apps/utility/src/agents/index.ts` | `tests/unit/agent-definitions.spec.ts` | **NW** | Test file: all assertions are `expect(true).toBe(true)` placeholders. Could not confirm via live test execution. |
| AC-6 | IPC event order on single lens: `agent.start` → `agent.tool.pre` → `agent.tool.post` → `agent.complete` | `apps/utility/src/orchestrator/hooks.ts` | `tests/unit/ipc-event-order.spec.ts` | **NW** | Test file: all assertions are `expect(true).toBe(true)` placeholders. Hooks code structure is correct per code-read but event-ordering is unverified by live assertions. |
| AC-7 | VerifierInput JSON contains no `<thinking>`, `chain_of_thought`, `reasoning_trace` keys | `apps/utility/src/verifier-assembler.ts` | `tests/unit/verifier-canary.spec.ts` | **NW** | Canary test: structural reasoning-trace check (AC-7a) is `expect(true).toBe(true)` placeholder. `canary-memo.md` existence and $43M planted-claim checks are real and pass. Assembler reads only `output_json` (not transcripts) — architectural guarantee confirmed by code-read, but runtime canary assertion is deactivated. |
| AC-8 | `transition()` persists atomically: UPDATE `runs` + INSERT `state_transitions` in one SQLite tx | `apps/utility/src/orchestrator/state-machine.ts` | `tests/unit/state-machine.spec.ts` | **NW** | Test file: all assertions are `expect(true).toBe(true)` placeholders. `state-machine.ts` correctly wraps both writes in `db.transaction(() => { ... })()` — atomicity is architecturally present but unverified. |
| AC-9 | Idempotency guard: duplicate `lens.complete` for same role is rejected | `apps/utility/src/orchestrator/state-machine.ts` | No dedicated spec found | **NW** | No idempotency spec file located. `transition()` logic filters `lensesInFlight` on `lens.complete` events — duplicate roles are excluded from `newComplete` because `.filter()` returns empty on a role not present in `lensesInFlight`. Untested. |
| AC-10 | `tsc --noEmit` compile error when cross-lens type is passed | `packages/shared-types/src/lens-context-bundle.ts` | No tsc fixture test | **NW** | Phantom-type branding (`__lensRole` field) is present in `LensContextBundle<R>` type. Compile-level enforcement not verified during this audit pass. |

**Verdict counts: 0 PASS / 1 FAIL / 0 CONCERN / 9 NEEDS WORK**

---

## 2. FAIL Detail — AC-2: Lens Isolation NOT Enforced at Runtime

### Finding

`buildLensContextBundleSchema<R>(role)` uses `z.object({...5 fields...}).superRefine(validator)`. In Zod v4.4.3 (installed per `packages/shared-types/package.json`: `"zod": "^4.0.0"`, resolved `4.4.3`), a plain `z.object()` strips unknown keys **before** the `.superRefine()` callback receives the data. The `illegalLeak` field (the foreign-role data) is silently removed before `findCrossLensLeaks` can see it. Parse returns success.

### BY-HAND Reproduction (AC-2) — FAIL Confirmed

Executed directly against compiled dist at `packages/shared-types/dist/lens-context-bundle.js`:

```bash
cd "/Users/russellteter/Claude Code Projects/c-suite"
node --input-type=module << 'EOF'
import {
  buildLensContextBundleSchema,
  findCrossLensLeaks,
} from './packages/shared-types/dist/lens-context-bundle.js';

const bundleWithCROLeak = {
  runId: 'run-qa-001',
  role: 'CFO',
  question: 'What is the cash lever?',
  playbook: 'cash_lever',
  contextDocuments: [],
  illegalLeak: {
    role: 'CRO',
    pipelineData: 'confidential-CRO-reasoning',
  },
};

// Direct function call — works correctly
const leaks = findCrossLensLeaks(bundleWithCROLeak, 'CFO', '');
console.log('findCrossLensLeaks result:', JSON.stringify(leaks));

// Schema parse — should throw, but does NOT
const schema = buildLensContextBundleSchema('CFO');
const result = schema.safeParse(bundleWithCROLeak);
console.log('safeParse success:', result.success);
console.log('safeParse data keys:', result.success ? Object.keys(result.data) : 'N/A');
EOF
```

**Actual output:**
```
findCrossLensLeaks result: [{"leakedRole":"CRO","path":"$.illegalLeak"}]
safeParse success: true
safeParse data keys: runId,role,question,playbook,contextDocuments
```

**Expected (per ADR §8 AC-2):** `safeParse` should throw (or return `success: false`) with a message containing `LensIsolationViolation`.

**Root cause:** `findCrossLensLeaks` correctly identifies the violation on the raw object. However, by the time `superRefine` runs, Zod has already stripped `illegalLeak` from `data`. The validator sees a clean 5-field object and reports no violations. The isolation guarantee is structural in the type system (phantom brand) but has **no runtime enforcement**.

### Impact on B3 (Keystone)

B3 is the "single trust-defining wiring in the product." AC-2 is the runtime half of B3: the assertion that a malformed bundle (containing a cross-lens leak) is detected and rejected at dispatch time. This assertion does NOT hold. **B3 must reopen.**

---

## 3. Systemic Finding — Test Placeholder Crisis

### Finding

Every Ch.3 acceptance criterion test is `expect(true).toBe(true)`. Real assertions are commented out with markers like `// RED: Runtime not shipped` or `// Activate after runtime ships`. But the runtime IS shipped — `state-machine.ts`, `dispatch.ts`, `hooks.ts`, `verifier-assembler.ts` all exist and have content. The Test agent shipped placeholder infrastructure but never activated assertions post-shipping.

### Evidence

- `tests/unit/run-loop-e2e.spec.ts`: 8 assertions, all `expect(true).toBe(true)`
- `tests/unit/lens-isolation/cross-lens-leak.spec.ts`: real imports commented out; body is tautologies
- `tests/unit/verifier-contract.spec.ts`: full seed helpers implemented; real assertions commented out
- `tests/unit/checkpoint-resume.spec.ts`: all `expect(true).toBe(true)`
- `tests/unit/agent-definitions.spec.ts`: all `expect(true).toBe(true)`
- `tests/unit/ipc-event-order.spec.ts`: all `expect(true).toBe(true)`
- `tests/unit/state-machine.spec.ts`: all `expect(true).toBe(true)`

The 783 passing tests include approximately 30+ Ch.3 ACs that pass only because `true === true`. This is a DOCTRINE law #2 violation (no shortcuts to please) and a law #7 violation (the writer/grader separation that law #7 requires also requires that tests actually grade).

---

## 4. Security Pass — B3 Verifier Input Contract

### Grep: Reasoning-trace leak check

```bash
grep -rn "thinking\|chain_of_thought\|reasoning_trace\|transcript" \
  apps/utility/src/ \
  --include="*.ts" \
  | grep -v "\.spec\." \
  | grep -v "//.*thinking"
```

**Result:** Zero hits in production code paths. `verifier-assembler.ts` reads exclusively from `agent_invocations.output_json` (structured Zod-validated outputs). The reasoning-trace isolation is architecturally sound — the assembler cannot pull transcripts because it never references the transcript column.

**Structural guarantee:** `hooks.ts` `onSubagentStop` writes `parseResult.data` (the validated structured output) into `output_json`. The assembler reads `output_json` via `SELECT output_json FROM agent_invocations WHERE role = ?`. No code path joins on or reads transcript/reasoning columns.

**AC-7 status:** Reasoning-trace exclusion is enforced by architecture, not by an active test assertion. The runtime is sound but the canary test's structural check is deactivated (NW, not FAIL — the protection exists; it's the test guard that is absent).

---

## 5. B3 Status Update

**Prior status (Ch.0/Ch.2 Audit/QA):** VERIFIED P0 — Verifier input contract is the trust-defining wiring. R2 verified 2026-05-26.

**Ch.3 Audit/QA finding (2026-05-27):** REOPEN.

- The **input-side** of B3 (verifier-assembler FAIL-CLOSED logic, no reasoning-trace in output_json) is architecturally correct and confirmed by code-read.
- The **runtime enforcement** of B3 (AC-2: lens isolation throws on cross-lens leak at dispatch time) is BROKEN. `buildLensContextBundleSchema` strips unknown keys before `superRefine` runs in Zod v4.4.3. A malformed bundle with a cross-lens leak passes schema validation silently.

**Fix required:** Fix-Integration must resolve the Zod v4 passthrough issue. Options: (a) add `.passthrough()` before `.superRefine()` if Zod v4 supports it; (b) validate the raw object directly before schema parse; (c) upgrade or pin a Zod v4 patch that preserves unknown keys in superRefine. This is Fix-Integration scope (DOCTRINE law #7 — writer ≠ grader).

---

## 6. Required Next Steps

**Verdict: CHAPTER REOPEN**

1. Fix-Integration: resolve AC-2 (`buildLensContextBundleSchema` Zod v4 strip-before-superRefine bug). Verify fix with BY-HAND reproduction: `safeParse(bundleWithCROLeak)` must return `success: false` with `LensIsolationViolation` in error message.
2. Fix-Integration: activate all Ch.3 test assertions (remove `expect(true).toBe(true)` placeholders). Every NW above requires a live test assertion before PASS can be awarded.
3. Re-Audit: after Fix-Integration, full re-audit pass required. At minimum must verify AC-2 PASS (BY-HAND) and all test assertions are live.

---

**QA Agent:** EvidenceQA
**Audit date:** 2026-05-27
**Evidence:** BY-HAND AC-2 reproduction (node --input-type=module against compiled dist), code-read of all production files, `pnpm run test:unit` run, grep for reasoning-trace leaks
**Next step:** Fix-Integration Ch.3 — then re-audit

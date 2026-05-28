# Mock / stub reliance audit — 2026-05-28

**Question (Russell):** Are agents relying on mock data/credentials out of shortcut-taking, such that the processes are not production-ready?

**Answer: Yes — extensively, in production runtime code.** This is not confined to unit-test mocks (those are legitimate). The C-Suite's core reasoning engine, its write-back proposal layer, several scheduled jobs, and at least the flagship cash-lever playbook's data-fetch all return stub/hardcoded/placeholder data in the production code path. There is **no real Claude model client wired anywhere**, and there is **no `@anthropic-ai/sdk` or Claude Agent SDK dependency** in any package.

This is a P0 production-readiness blocker. It is larger than the Ch.7 assembly gap. The "Phase 2 COMPLETE" claim was wrong on two counts: the frontend was never assembled (B46) AND the agent brain was never connected to a real model (this entry, B47).

---

## What is LEGITIMATE (not a problem)

Unit tests that mock `fetch`, `googleapis`, the OAuth flow, and the Salesforce/NetSuite clients are correct testing practice — they isolate the unit under test. Examples: `tests/unit/mcp/**/*.spec.ts`. These are fine and should stay. The audit below is strictly about **production (`apps/.../src`) runtime paths**.

---

## Finding 1 (P0) — No real model client; the agent runtime is entirely the stub harness — KEYSTONE LANDED (B47)

**Status: KEYSTONE LANDED — B47 closed.** `RealClaudeClient` + `modelClientFromEnv()` factory wired into `dispatch.ts` and `run-loop.ts`. `STUB_MODE=live` → real model calls via Max subscription. Items 2–6 below still open.

The "stub-model harness" (`packages/stub-harness`) was built as the Ch.0–Ch.4 testing scaffold (delivery.md §Stub-model harness: "CI default STUB_MODE=replay; zero live inference in CI"). It was **never replaced with a real client** for production. The real-client path does not exist.

- `packages/stub-harness/src/stub.ts:27-30` — `StubMode='live'` **throws**: `"StubMode=live not wired in Ch.0; Runtime dispatch implements at Ch.3"`. `'record'` also throws (`:33-34`). Only `'replay'` works (reads fixtures from `tests/fixtures/stubs/`).
- `apps/utility/src/orchestrator/dispatch.ts:17` — `mode = process.env.STUB_MODE ?? 'replay'` (default = canned fixtures).
- `dispatch.ts:75-90` — in replay with no fixture, returns **minimal stub lens output** with `citations: [{ id: 'stub-${role}', text: 'Stub citation', source: 'stub' }]`.
- `dispatch.ts:93-98` — the `'record'`/`'live'` branch still routes through `@c-suite/stub-harness` `stubFromEnv()` — **there is no real-model branch at all**.
- `apps/utility/src/orchestrator/run-loop.ts:20,200-206` — run-loop instantiates `StubClaudeClient` + `StubVerifierInvoker`.
- Same stub import in: `agents/verifier-runner.ts:2`, `agents/handoff/runner.ts:8`, `playbooks/open-qa/index.ts:27`, `playbooks/lib/decomposer.ts:13`.
- **No `@anthropic-ai/sdk` / `claude-agent-sdk` / Anthropic dependency** in root or any workspace `package.json` (grep returned nothing). `runtime.md` describes a "Claude Agent SDK orchestrator" but only behind 🔍 VERIFY markers + "deferred to Ch.3" — Ch.3 built the stub dispatch, not the real SDK wiring.

**Consequence:** In production today, every lens, the Verifier, the Synthesizer, the Handoff Agent, and the decomposer either throw (if `STUB_MODE=live`) or return canned fixture/stub output (default `replay`). The product cannot perform real strategic analysis.

## Finding 2 (P0) — Verifier rigor scores are hardcoded in playbooks

The Verifier is "deferred to run-loop," but run-loop's Verifier runs on the stub. Meanwhile playbooks hardcode the score:
- `playbooks/pre-mortem/index.ts:159` — `const rigorScore = 72; // placeholder`
- `playbooks/stakeholder-1-1/index.ts:204` — `const rigorScore = 75; // placeholder`
- `playbooks/open-qa/index.ts:121` — `const rawScore = 88; // placeholder`
- `playbooks/quick-read/index.ts:33` — `RIGOR_THRESHOLD = 0; // Verifier bypassed; no-op`
- `board-narrative`, `restructure-decision`, `gtm-realloc`, `strategic-option` all carry `// Verifier (placeholder — real Verifier in run-loop)`.

**Consequence:** Memos ship with fabricated rigor scores. The anti-sycophancy rigor gate — a core PRD promise — does not actually run.

## Finding 3 (P0) — Synthesizer write-back proposals are empty stubs

- `run-loop.ts:248` — `synthesizerProposals: [] // stub: populated by real Synthesizer in production`
- `playbooks/open-qa/index.ts:132` + `pre-mortem/index.ts:172` — `proposedWritebacks: [] // Synthesizer authors these in production`

**Consequence:** The "proposed write-backs surface; Russell accepts → vault updates" loop (PRD outcome 3) produces nothing.

## Finding 4 (P0) — Flagship cash-lever playbook fabricates tool-call data

- `playbooks/cash-lever/index.ts:37` — AWS spend is a **hardcoded `const result = [...]`** array with synthesized `tool_call_id: tc-aws-${Date.now()}` and `tool_name: 'aws.spendSummary'`, NOT a real `ctx.deps.aws` call. Log lines at `:76,:117,:165,:208` say "SF pipeline stub / AWS spend stub / NetSuite cash stub / Cash model stub".

**Consequence:** Click-any-claim → tool-call traceback would surface FABRICATED tool results. This violates the separate-static-from-dynamic-data rule and DOCTRINE #1. The "first usable product at Ch.5" does not use real data.

## Finding 5 (P1) — Scheduled jobs not wired to real sources

- `jobs/sundayRenewal.ts:38` — `// Real implementation: ctx.deps.salesforce.query(...)` (renewal job does not query SF).
- `jobs/sundayRenewal.ts:68` — `// Real implementation: call Chorus MCP client for each account.`
- `jobs/mondayTripwire.ts:128-131` — hardcoded `cash-runway-weeks: 24`, `arr-churn-pct: 0.08`, etc. (some legitimately gated on the Day-Zero form per B6, but presented as metrics).
- `orchestrator/index.ts:52` — `resumeRun: ... production IPC path not yet wired`.

## Finding 6 (acceptable, for contrast) — degraded-mode + Day-Zero placeholders

Some placeholders ARE legitimate and correctly flagged: AWS-SSO-expired degradation (cash-lever:24-33), NetSuite degraded-mode warnings (TRACK 3), and Day-Zero covenant thresholds (mondayTripwire:82, B6) that are documented as pending Russell input. These surface as `degraded_sources`/warnings rather than masquerading as real data. The fix for findings 1–5 must follow this honest-degradation pattern, not hide behind it.

---

## Why this slipped

Same root cause as B46: chapter audits validated against the stub harness ("zero live inference in CI") and never required a real end-to-end run with live inference + live data. "Tests green on fixtures" was accepted as "chapter done." The stub harness was a correct *testing* tool that quietly became the *production* implementation because the real-client wiring was perpetually deferred ("Ch.3 wires the real SDK") and never landed.

---

## Remediation plan (proposed — Phase 3: real-inference wiring)

This is a substantial body of work, effectively the core product engine. Recommended sequencing:

1. **Add the real model client.** Add `@anthropic-ai/sdk` (or the Claude Agent SDK if the forked-agent orchestration is still desired) as a dependency. Implement a `RealClaudeClient` behind the SAME interface `StubClaudeClient` implements, with auth (Max-subscription or API key per runtime.md R1 VERIFY).
2. **Make dispatch select real vs stub by env.** `dispatch.ts` + `run-loop.ts`: `STUB_MODE=live` → real client; `replay`/`record` → stub (tests/dev only). Remove the throw in `stub.ts` live mode (replaced by the real client living in production, stub staying test-only).
3. **Wire the real Verifier** into run-loop so playbook rigor scores come from `runVerifier`, not hardcoded constants. Delete the `rigorScore = NN` placeholders.
4. **Wire the real Synthesizer** so `synthesizerProposals` / `proposedWritebacks` are populated.
5. **Replace fabricated playbook data with real MCP calls.** cash-lever (and every playbook) must call `ctx.deps.{salesforce,aws,netsuite,...}` and use real tool-call results for citations. Honest degradation when a source is unavailable.
6. **Wire the scheduled jobs** (sundayRenewal, mondayTripwire) to real MCP queries; keep Day-Zero-gated values flagged as directional until the form is submitted.
7. **Acceptance:** an INTEGRATION-PROOF live run (per the TRACK 7 amendment) — STUB_MODE=live, real Claude inference, real MCP data, a memo whose citations click through to REAL tool results, a real rigor score, real write-back proposals. Plus a doctrine/acceptance amendment forbidding production stub-reliance.

**Scope note:** items 1–2 are the keystone (everything else depends on a real client existing). This is likely its own focused session, not a finishing-touches track.

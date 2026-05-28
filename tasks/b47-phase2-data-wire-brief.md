# B47 Phase 2 — real data + Verifier wiring brief

Phase 1 (this session) landed the **live-mode stub guard**: every playbook exports
`STUBBED_SOURCES`, and `STUB_MODE=live` now REFUSES any playbook that still
fabricates data or hardcodes a rigor score (escape hatch `ALLOW_STUBBED_LIVE=1`
downgrades to a loud warning + `degraded_sources`). The lie is now loud. Phase 2
makes it true.

## Architectural directives (read FIRST — they override the audit's framing)

1. **Verifier integration belongs in run-loop's early-return path, ONE site — not
   in each playbook.** `apps/utility/src/orchestrator/run-loop.ts` lines ~84-146
   (the Ch.7 early-return that handles all 8 non-cash playbooks) currently trusts
   `playbookResult.rigorScore` WITHOUT running the Verifier. The generic path
   (lines ~218-231) already runs the real Verifier via `modelClientFromEnv()`.
   The fix: after `runPlaybookGuarded(...)` returns in the early-return path, run
   the Verifier on the playbook output (mirror the generic path) and override
   `rigorScore`. The 7 hardcoded `rigorScore = NN` values in the playbooks become
   dead code — delete them ONLY AFTER run-loop overrides them, then drop
   `'verifier_rigor'` from each playbook's `STUBBED_SOURCES`.
   - Do NOT "edit 7 playbooks to call runVerifier." That is the mistake the audit's
     Finding 2 framing invites. One run-loop site.
   - `quick_read` is exempt — Verifier is bypassed by design (ADR-0009 §3.5). Its
     `STUBBED_SOURCES` is already `[]`. Leave it.

2. **cash-lever data wiring (audit Finding 4).** `apps/utility/src/playbooks/cash-lever/index.ts`
   - Thread `ctx.deps` through: `runPlaybook` (line ~389) currently calls
     `runCashLeverPlaybook(ctx.runId, input.prompt, { db: ctx.db })` and DROPS
     `ctx.deps`. Pass deps in; `runCashLeverPlaybook` must accept and use them.
   - Replace the four `stub*Query` helpers with real client calls:
     - `stubSalesforceQuery` → `ctx.deps.salesforce.query(soql)` (SOQL per ADR-0006
       §1.3 — the stage list is already in the stub's `args_json`).
     - `stubAwsSpendQuery` → `ctx.deps.aws.getCombinedCost({ start, end })`.
     - `stubNetSuiteQuery` → `ctx.deps.netsuite.runSuiteQL(query)` (returns `null`
       in degraded mode — handle it).
     - `stubCashModelQuery` → real xlsx read (path from VAULT_PATH; merged-cell
       handling). This one may stay degraded longest; keep `'cash_model'` in
       `STUBBED_SOURCES` until the real reader lands.
   - Honest degradation: when a dep is absent/unauth, push to `degraded_sources`
     (existing pattern), do NOT fabricate. Use `evaluatePrereqs` (block/degrade/proceed).
   - Drop each source from `STUBBED_SOURCES` as it becomes real. cash-lever can run
     live once `STUBBED_SOURCES` is `[]` (or only genuinely-degraded entries remain).
   - **Verification is gated on Russell's connectors** (see below). A mocked-deps
     unit test can prove the WIRING SHAPE now; real SOQL/SuiteQL SEMANTICS against
     Class's schema can only be validated after NetSuite OAuth + AWS SSO are connected.
     Do not claim cash-lever "real" until a live run with `STUB_MODE=live` produces a
     memo whose citations click through to REAL tool-call results (rule:
     verify-live-endpoints-before-done).

3. **Deferred beyond Phase 2** (own sessions): Synthesizer write-back proposals
   (Finding 3 — note: empty writebacks are honest emptiness, intentionally NOT in
   the guard vocabulary) and scheduled-job source wiring (Finding 5).

## Blocked-on-Russell (cannot live-verify cash-lever without these)
- NetSuite: OAuth Integration Record → `NETSUITE_OAUTH_CLIENT_ID` → in-app Connect
  (handoff Russell-action #1, not yet done).
- AWS: `aws sso login` for `class` + `collab` profiles.
- Real inference: `CLAUDE_CODE_OAUTH_TOKEN` set, `ANTHROPIC_API_KEY` unset.

## Acceptance (Phase 2 done)
- Verifier: an 8-playbook early-return run produces a rigorScore from `runVerifier`,
  not a constant; the 7 hardcoded values deleted; `verifier_rigor` gone from all
  their `STUBBED_SOURCES`; the anti-rot test (`tests/unit/orchestrator/stub-guard.spec.ts`)
  still green.
- cash-lever: `STUB_MODE=live` + connected NetSuite/AWS → memo with real,
  click-through tool-call citations; `STUB_MODE=live` + missing AWS → guard silent
  (cash-lever clean) but `degraded_sources: ['aws']` honestly populated.

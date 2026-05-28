# Handoff — B47 Phase 2: real Verifier + real cash-lever data (2026-05-28)

## What shipped this session (committed + pushed)
- **Real Verifier scores all Ch.7 playbooks** (commit `f12d185`). Deleted 7
  hardcoded `rigorScore = NN` placeholders. New `playbookVerifier.ts` adapts the
  in-memory result → VerifierInput and runs the real Verifier at ONE run-loop site.
  Live mode MUST produce a real score (rethrows on failure); replay falls back to a
  labelled constant. `'verifier_rigor'` dropped from all 7 STUBBED_SOURCES.
- **cash-lever wired to real Salesforce/AWS/NetSuite** (commit `aaa6999`) with
  honest degradation + real tool_call recording. STUBBED_SOURCES: 4 → `['cash_model']`
  (only the xlsx reader remains stubbed).
- 376 orchestrator+playbook+jobs tests pass; `pnpm typecheck` clean (9 workspaces).

## Truth over appearance — what is NOT live-verified (DOCTRINE #1)
The session goal was "real live data universally, verified in production." That is
not fully achievable in one session because three connectors + inference are gated
on Russell. What's real now: all code paths call real clients with honest
degradation, unit-proven. What's unverified-live: see the unblock list.

## Russell unblock list (each enables a real verification)
1. **AWS (closest — only blocker is a fresh token):** run
   `aws sso login --profile class && aws sso login --profile collab`. Then I re-run
   the live `getCombinedCost` check (class+collab real spend). SSO expired
   mid-session — that's the ONLY thing between us and a verified live AWS path.
2. **Inference token:** `claude setup-token` → put `CLAUDE_CODE_OAUTH_TOKEN` in
   `apps/main/.env.local`, ensure `ANTHROPIC_API_KEY` unset. Enables a live
   integration-proof memo (real Verifier rigor score, real citations).
3. **NetSuite credential TYPE (you're checking):** confirm in NS Setup whether the
   integration record you created is the **AI Connector Service** (scope `mcp` —
   current code path works; the Consumer Secret threads into token exchange via the
   already-present optional `clientSecret`) OR a **standard Integration Record**
   (scope `rest_webservices` — needs a NEW REST SuiteQL data path the repo doesn't
   have). DO NOT store the Consumer Secret in `.env.local` until this is confirmed.
4. **NetSuite cash query:** after NS connects, validate a cash-position SuiteQL
   against Class's GL/account schema, then set `NETSUITE_SUITEQL_CASH_POSITION` in
   env. Until set, cash-lever degrades NetSuite honestly (no guessed query runs —
   deliberate DOCTRINE #1 choice).
5. **Salesforce:** creds located at
   `/Users/russellteter/projects/class-budget-tracker-main/salesforce-mass-delete-tool/config.mjs`
   (the storage-reduction project). Copy `clientId`/`clientSecret` into
   `apps/main/.env.local` as `SALESFORCE_CLIENT_ID`/`SALESFORCE_CLIENT_SECRET` (the
   auto-mode classifier blocked me from reading that file).
6. **To run cash-lever live before cash_model lands:** `STUB_MODE=live
   ALLOW_STUBBED_LIVE=1` (the escape hatch downgrades cash_model to a degraded_source;
   SF/AWS/NS run real).

## Known calibration caveat (not a bug — flag for first live run)
Verifier scores for adversarial-only / lens-light playbooks (pre-mortem etc., which
pass empty `positionMetadata` + few/no lens outputs) are now REAL but their
CALIBRATION is unvalidated. Eyeball the rigor score on the first live memo per
playbook; if a playbook scores oddly low because the Verifier prompt expects lens
breadth, adjust the prompt or the adapter — do not re-introduce a hardcoded score.

## Still deferred (own sessions)
- Finding 3: Synthesizer write-back proposals (empty = honest emptiness, not in guard vocab).
- Finding 5: scheduled-job real sources (sundayRenewal, mondayTripwire metrics).
- cash_model xlsx reader (then drop `'cash_model'` from STUBBED_SOURCES via the
  `CASH_MODEL_XLSX_PATH` env-gate pattern).

## Resume recipe
1. `git pull` (HEAD should be `aaa6999` or later) + `pnpm install`.
2. Read this file + `docs/build-log.md` (B47 Phase 2) + `tasks/b47-phase2-data-wire-brief.md`.
3. If AWS SSO refreshed: re-run the live AWS check (see git history / build-log for the
   `getCombinedCost` probe), then mark cash-lever AWS path verified.
4. Verify state: `pnpm typecheck` (clean); `npx vitest run tests/unit/orchestrator/
   tests/unit/playbooks/ tests/unit/jobs/` (376 pass).

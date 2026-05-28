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

## Connector status (updated after Russell supplied creds 2026-05-28)
- **Salesforce — LIVE VERIFIED.** No Connected App needed; rides the `sf` CLI session
  (class-prod). 612 real Opportunities returned. buildDeps gap fixed (`ebccafc`).
- **AWS — LIVE VERIFIED (partial).** class = $493,848.41 real; collab degrades
  honestly. Remaining: fix collab SSO login (see below) for the summed view.
- **NetSuite — creds active, Connect pending.** AI Connector / `mcp`, confidential
  client; secret threaded. Russell must: (a) in-app Connect (browser consent) to mint
  the refresh token + revoke old TBA `2b80c7a9`; (b) validate a cash-position SuiteQL
  vs Class's schema and set `NETSUITE_SUITEQL_CASH_POSITION` (until set, NetSuite
  degrades honestly — no guessed query runs, DOCTRINE #1).
- **Inference token — set** in `.env.local`. Enables STUB_MODE=live in the app.

## Remaining Russell actions
1. **AWS collab SSO:** `aws sso login --profile collab` failing. collab uses a
   separate sso-session (start URL `https://d-9067b2215a.awsapps.com/start`, role
   `Billing`, acct 421879804649). Diagnose: `aws sso login --profile collab` and
   capture the exact error; if the portal URL or role changed, re-run
   `aws configure sso --profile collab`. Until fixed, AWS data is class-only (flagged).
2. **NetSuite Connect** (browser consent) + validate/set `NETSUITE_SUITEQL_CASH_POSITION`.
3. **Full end-to-end live memo:** run the Electron app with `STUB_MODE=live`
   (+ `ALLOW_STUBBED_LIVE=1` while cash_model is still stubbed). buildDeps needs the
   Electron safeStorage to construct the SF/NS clients, so the full cash-lever live
   run happens in the app, not a headless script. Client-level data paths already
   proven live this session.

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

# Cash Lever Reliability Characterization — 2026-06-01

Resume recipe next step: run the live `cash_lever` harness 2–3× more, confirm consistent
end-to-end completion. **Serial by design** (one Electron lock, one DB, one token budget).
Workflow for follow-ups (synth-size, telemetry, cash_model un-stub) runs AFTER, app off.

## Success definition (per advisor)
Success = **chain completes**: memo file written + real Opus verifier rigor score (NOT the 85
fallback). `CLEAN` vs `DEGRADED` is an **attribute to record, not pass/fail** — a stale AWS SSO
token or a connector degrading differently than f617c0ed yields a DEGRADED stamp that is NOT a
reliability failure. A failed/hung run is the most informative outcome — diagnose from the
preserved log before relaunching; do not blind-retry.

## Per-run protocol
1. `pkill -9 -f electron@33.4.11; UPDATE runs SET status='failed' WHERE status='in_progress'`
2. Launch `node tests/e2e/live-cash-real-vault.mjs` (background; sets STUB_MODE=live + real VAULT itself).
3. On completion: **copy `/tmp/live-cash-real-vault.log` → `/tmp/live-run-N.log` BEFORE next launch**
   (harness truncates the log on every launch — `:39`).
4. Record the row below; append findings to `docs/build-log.md` after each run (durable).

## Baseline — f617c0ed (2026-05-31, shipped_clean, rigor 92)
Lenses 133–224s · RedTeam 141s · Steelman 151s · **Synth 722s / 38327B structured** · memo 11.8KB.
`model`/`tokens_out` NULL (telemetry gap, expected). Synth ceiling 25m=1500s → ~2× margin.

## Queries
- Run row: `SELECT substr(run_id,1,8),status,rigor_score,length(memo_path) FROM runs WHERE playbook='cash_lever' ORDER BY started_at DESC LIMIT 1`
- Synth duration: `SELECT agent_role,(completed_at-started_at) secs,length(structured_output_json) b,status FROM agent_invocations WHERE run_id LIKE 'XXXX%' ORDER BY started_at`

## Results
| # | run_id | status | rigor | synth_s | synth_B | memo_KB | degraded | notes |
|---|--------|--------|-------|---------|---------|---------|----------|-------|
| 0 | f617c0ed | shipped_clean | 92 | 722 | 38327 | 11.8 | (baseline) | reference |
| 1 | a9d30924 | shipped_clean | 90 | 659 | 38117 | 12.9 | none (CLEAN) | matches baseline; handoff state; real Opus score |
| 2 | 82650c08 | shipped_clean | 91 | 415 | 34907 | 11.4 | none (CLEAN) | synth faster (415s); handoff; real Opus score |
| 3 | e439c7fa | shipped_clean | 91 | 366 | 36342 | 10.2 | none (CLEAN) | synth fastest (366s); handoff |

## Characterization — RESOLVED (4/4 clean) 2026-06-01
- **100% success: 4/4 consecutive `shipped_clean`** (f617c0ed, a9d30924, 82650c08, e439c7fa) on commit `9b5db30`.
- **Rigor 90–92**, all real Opus scores (none the 85 fallback); all reached `handoff` state.
- **Synth 366–722s** (6–12min) — none near the 25m=1500s ceiling. Margin vs this session's max (722s) = 2.05×;
  vs the historical max synth (1027s, run `00259e19`) = 1.46× — adequate, no false-aborts, but the synth-size
  trim would also widen it. Synth got faster each run (722→659→415→366; likely model-side variance).
- **Synth structured output 34.9–38.3KB consistently** → renders to 10–13KB memos. Size is the real remaining
  issue (UX, open thread #2), NOT reliability.
- No SDK stalls, no retries, no failures across 4 runs. Real 10-lever grounding + real multi-lens reconciliation every run.
- `shipped_clean` despite `cash_model` stubbed (no `ALLOW_STUBBED_LIVE`) — stub-guard wiring unconfirmed; investigate (workflow).
- Open thread #1 (cross-run reliability) **CLOSED**. Next phase: synth-size trim + telemetry writers + cash_model/guard.

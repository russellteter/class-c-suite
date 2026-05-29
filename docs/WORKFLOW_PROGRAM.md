# WORKFLOW PROGRAM — C-Suite to V1 (execution organization)

> Companion to `docs/PRODUCTION_PLAN.md` (the phase/gate source of truth). This doc organizes the
> remaining work into Claude Code **Workflows** (deterministic parallel fan-out) interleaved with
> **serial gates** (live APP-PROOF on the running Electron app; Russell hard gates). Operating
> posture: **ultracode** — a workflow per substantive phase, adversarial verification of every
> finding, exhaustiveness over token thrift. Formed 2026-05-28.

## What a Workflow can and cannot do here (honest scope — so "no corners cut" is real)

- **CAN** (parallel, deterministic, adversarially verified): breadth audits; per-connector /
  per-screen / per-playbook builds; research sweeps; test authoring; verification of findings.
- **CANNOT**: serial live verification (a single Electron instance + single-instance lock means
  one run is observed at a time); OAuth browser consents; native macOS behavior (sleep/wake,
  notifications, hotkey); the 8 on-Mac demos. These are **SERIAL GATES**, not fan-out.

A workflow that "proves" an on-Mac demo would be a corner cut. The program below keeps every
APP-PROOF and hard gate explicitly serial.

## Control model (locked — `tasks/lessons.md` 2026-05-28)

1. Workflow agents **EDIT in worktree isolation or RETURN findings — they NEVER `git commit`.**
2. The orchestrator (main thread) reviews every diff, runs typecheck + the suite, and **commits
   serially**. Exactly one actor on `main`.
3. Every live APP-PROOF runs on the main thread against the running app; evidence cited inline in
   `docs/build-log.md`.
4. **Writer ≠ grader**: each phase is closed by an independent audit (a final workflow stage or a
   separate audit agent re-deriving PASS/FAIL from `PRODUCTION_PLAN.md` + the spec).
5. No silent caps: any bounded coverage (top-N, sampling) is logged.

## ABI two-mode invariant (carry through the whole program)

- App / e2e / live proofs: better-sqlite3 @ **Electron ABI 130** (current state — verified).
- Phase-0 enforcing unit suite under Node: better-sqlite3 @ **Node ABI 137**.
- The rebuild tooling (task #4) must flip cleanly both directions; same migrations seed tests + app.

---

## The program

### WF-1 — Live-path readiness audit (READ-ONLY) — run first, highest leverage
**Why:** live-vs-replay drift was being found one slow 3.5-min UI run at a time
(`dist/prompts` ENOENT, then Verifier JSON-preamble). Surface ALL remaining drift in one pass.
**Fan-out:** one agent per playbook (8) + Synthesizer + verifier-assembler + the agent prompt
loaders + each connector dep. Each audits its target's LIVE path for: (a) disk assets `tsc`
drops (read relative to `dist/`); (b) bare `JSON.parse` on model output; (c) unguarded stubs
reaching a CLEAN stamp; (d) connector deps needing consent / blocked; (e) schema columns code
reads vs migrations.
**Adversarial verify:** every finding re-checked by an independent agent (real vs false positive).
**Output:** ranked, deduped, verified defect list → main thread fixes serially, one commit each.

### GATE-3 — Live engine full proof (SERIAL)
After WF-1 fixes land: ONE live run via the assembled app — vehicle **board_narrative**
(manual approval → no auto-approve double-fire; Verifier-wired; `STUBBED_SOURCES=[]`): real
inference + real Verifier rigor → memo SafeWrite; below-threshold ⇒ `.draft.md`. Plus
**runtime.db restart-survival** (launch → run → close → relaunch → nav-history shows the run).
Evidence → build-log. (Already proven this session: ABI-130 main+utility; renderer round-trip;
runtime.db persistence at the data layer; live inference; live Verifier rigor score.)

### WF-2 — Phase 2 connectors to 100% real-time (fan-out: 1 agent/connector)
SF / AWS / Chorus: re-confirm live + schema-drift. PowerBI: `mcp-live-smoke.sh powerbi` +
python spot-check (real account names, real `minutes_90d`). Build the **cash_model xlsx reader**
(removes the last guarded stub) — 1 agent. **NetSuite / Gmail OAuth = Russell HARD GATES**
(surface in-app). **Decide+log:** cash_lever rigor — route through the unified Verifier path
(run-loop.ts:39 currently excludes it) OR record as tracked debt against V1 outcome #2 ("every
memo carries a rigor score"). **GATE-2 (serial):** `mcp-live-smoke.sh all` returns real (not
BLOCKED) for every connector not behind a consent gate.

### WF-4 — Surface integration proofs (fan-out: 1 agent/screen, worktree isolation)
One agent per screen — Home, RoundTable, MemoViewer, WritebackPane, ConversationPane,
AcceptedHistory, HandoffPreview, SettingsScheduler, Connectors, NotificationSettings — each
drives the assembled app via the `_electron` e2e harness (its own throwaway userData, so
parallel launches are safe), captures a REAL-data screenshot, and asserts the screen's real
IPC data path (not fixtures). Wire the compounding write-back loop (run → auto-draft →
accept/edit/reject → active library grows). **Adversarial verify** each screenshot (real data,
not placeholder). **GATE-4 (serial):** accepted-writeback-flips-to-active round trip in the
running app.

### WF-5 — Autonomy + native feel (mixed)
**Fan-out:** 5 cron jobs wired to LaunchAgent; catch-up (each missed job fires once);
concurrent-edit safety (read→sha256→work→re-hash→atomic rename→commit; sidecar on conflict);
Cowork handoff round-trip auto-link. **SERIAL / Russell HARD GATES:** sleep/wake survival;
native notification on tripwire flip; global hotkey; menubar resident — observed on-Mac over time.

### GATE-6 — V1 on-Mac demos (SERIAL + Russell)
`pnpm build` → unsigned `.app` → run each of the 8 `PURPOSE.md` outcome demos. An **independent
audit agent** re-derives PASS/FAIL per demo against the spec. 8/8 = V1 done.

---

## Definition of done (no corners cut)

V1 done = all 8 `PURPOSE.md` outcomes demonstrably true on Russell's Mac, each closed by an
independent audit, with APP-PROOF evidence cited in `docs/build-log.md`. CI-green / typecheck /
unit-pass are necessary, **never sufficient** — the running app performing the real action with
real data is the only close gate.

## Execution ledger (updated as the program runs)

- 2026-05-28: Program formed. Phase 3 live-path: ABI-130 (main+utility) proven; renderer
  round-trip proven; runtime.db persistence proven (data layer); live inference proven; **two
  live-path bugs fixed** (prompt assets not copied to `dist/`; Verifier JSON-preamble →
  client-side extraction in `RealClaudeClient`). Next: WF-1.

# ROADMAP — Chapter Sequence, Gates, Exit Criteria

> The spine `/goal` follows. Twelve units: **Phase R** (deep research) + **Chapter 0-11** (build) + **Chapter 12** (optional post-V1 tuning). Each chapter has a goal, the PRD §4 outcome it serves, the gates that pause it, and the exit criteria that close it. Effort estimates are parallelized agent-team working-days under the Max throttle. **First usable product at Chapter 5.**

## Sequencing law

**Prove the catastrophic-risk core early.** The sequence is engineered so the things that would kill the product if they failed late are validated first:

1. **Deep research (Phase R)** — verify reality before designing over it.
2. **SafeWrite + git (Ch.2)** — vault data loss is catastrophic and unrecoverable. Prove the pattern under fuzz before the runtime depends on it.
3. **Runtime spine + Verifier rigor (Ch.3-4)** — Verifier reasoning-trace isolation is the trust-defining wiring. If the Verifier rubber-stamps, the whole rigor edifice is theater. Prove it on stubs.
4. **First end-to-end slice (Ch.5)** — one full playbook (Cash lever) running real → memo → vault. Proves the architecture holds.
5. **Write-backs + feedback (Ch.6)** — the compounding loop that makes the system get smarter.
6. **All playbooks + Open Q&A + home (Ch.7)** — surface area complete.
7. **MCPs + PowerBI (Ch.8)** — real data substrate.
8. **Cowork handoff (Ch.9)** — closes the loop to execution.
9. **Autonomy (Ch.10)** — scheduled jobs.
10. **Package + on-Mac verification (Ch.11)** — ship.

## Hard gates — where `/goal` pauses

Per `DOCTRINE.md` operating-mode override, gates are minimized. The remaining gates:

1. **Design gates (UI chapters).** Russell approves an `html-driven-codev` mockup before screens are coded. Mockup sequencing per `docs/architecture/ui.md` §12-step.
2. **Genuine product-shape forks.** Use `interactive-html-decisions` or `html-driven-codev` when a fork would propagate downstream rework. Examples: PowerBI integration shape (Ch.8), LaunchAgent vs LaunchDaemon (Ch.10).
3. **On-Mac verification (Ch.11).** Russell runs the eight outcome demos on his Mac. The cloud cannot self-verify menubar, hotkey, notifications, sleep/wake survival, notarized install.

All other gates from the ultraplan ("billing path confirmation," "Cowork concurrency policy," etc.) become "decide and log" under the override — `/goal` resolves under doctrine, logs to `docs/build-log.md`, proceeds.

---

## The twelve units

### Phase R — Deep research
**Goal.** Verify reality. Surface blockers. Correct architecture assumptions. Send NetSuite TBA request.
**PRD outcome.** Enabler for all.
**Gates.** None (operates under doctrine).
**Exit criteria.** See `RESEARCH.md` "Phase R exit gate."
**Effort.** Research-only; no production code.

### Ch.0 — Foundations
**Goal.** Repo skeleton. Locked Zod/IPC contracts. CI. Stub-harness scaffold.
**PRD outcome.** Enabler.
**Gates.** None.
**Exit criteria.**
- TypeScript monorepo (Electron main + utility + renderer + shared types).
- `pnpm` workspace; `electron-builder` configured (signing/notarization deferred to Ch.11).
- Locked Zod schemas for every vault artifact type (matched byte-for-byte to R0 findings).
- Typed IPC discriminated-union spans main ↔ utilityProcess ↔ renderer.
- CI: typecheck + lint + unit tests green; **zero live inference** required for CI.
- Stub-model harness skeleton (replays canned agent outputs for testing).
- `docs/build-log.md` Ch.0 entry written.
**Effort.** 2-4 days.

### Ch.1 — Process architecture, IPC, SQLite, scheduler
**Goal.** The three-process shell. SQLite runtime store. Token-budget concurrency scheduler.
**PRD outcome.** Enabler.
**Gates.** None (billing-path "decide and log" — Phase R already resolved Max vs API).
**Exit criteria.**
- Electron main + utility + renderer running, IPC round-trip verified.
- Supervised utility process restarts on crash; state recovers from SQLite checkpoint.
- Token-budget scheduler caps concurrent agents per Max-window math; degrades to sequential under pressure; emits backoff events.
- SQLite migrations idempotent; runtime store schema versioned.
- Logs structured (JSON) with correlation IDs spanning the three processes.
**Effort.** 4-6 days.

### Ch.2 — SafeWrite + git
**Goal.** Vault writes that survive concurrent Obsidian / Cowork edits without data loss.
**PRD outcome.** Outcome 4 (partial — vault concurrent-edit safety).
**Gates.** "Decide and log" on Cowork concurrency policy (default: accept sidecar conflicts during Cowork fallback; don't block Cowork writes).
**Exit criteria.**
- SafeWrite utility: read → sha256 → work → re-hash → atomic temp + rename → git-commit.
- **Concurrent-write fuzz test: zero data loss** under simulated Obsidian + Cowork + C-Suite concurrent edits across all artifact zones.
- One `.proposed-<ts>.md` sidecar per conflict; conflict surface in UI deferred to Ch.5.
- One structured git commit per write (`c-suite: <agent> wrote <file> during <playbook> run <run_id>`).
- chokidar watches the vault; debounced re-index on external edits.
- Agent-exclusive zones (predictions, investigations, deliverables, memos) skip hash-check; shared zones do not.
**Effort.** 5-7 days.

### Ch.3 — Runtime spine + stub harness
**Goal.** State machine. 12 AgentDefinitions. Verifier input contract enforced. Full loop runs on stubs.
**PRD outcome.** Enabler for outcomes 1, 2, 3.
**Gates.** None.
**Exit criteria.**
- Typed `RunState` machine: bootstrap → plan-approval → parallel-independent 6-lens fan-out → Red-Team + Steelman → Synthesizer → Verifier → ship-clean/DRAFT → write-backs → review/feedback (≤N=3) → commit → Handoff → Run-Critic.
- All 12 agents declared as `AgentDefinition`s with concrete prompt skeletons (full prompts arrive in Ch.4).
- SDK hooks (`PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`) drive the round-table node lifecycle.
- **Lens isolation proven** — assertion throws if any lens sees another lens's intermediate work.
- **Verifier input contract** (per PRD §5): the assembler fails closed if any required input is missing (draft, structured lens outputs, audit trail, position metadata, Red-Team/Steelman outputs).
- Full loop runs end-to-end on the stub harness with zero live inference.
- Node-granular SQLite checkpoints; a crashed utility process resumes without re-running completed lenses.
**Effort.** 7-10 days.

### Ch.4 — Prompts + rigor scoring + Verifier
**Goal.** Verbatim 12 prompts. Pure `rigorScore()`. Anti-sycophancy Verifier.
**PRD outcome.** Outcome 2 (sourced rigor).
**Gates.** None.
**Exit criteria.**
- Verbatim lens frames for CEO/CFO/CRO/CMO/COS from `Strategic_AI_Invocation_Guide.md`.
- **Fully-authored CPO lens** grounded in `turnaround_operating_library.md` (SaaS Turnaround Patterns + AI-Native Operations).
- Synthesizer prompt ("reco don't average") with brand-voice baked in (`russell-voice` for personal-facing, `class-brand-voice` for company-facing).
- **Verifier prompt** with forced JSON schema; rejects empty falsifiers + missing-data flags; structurally blind to lens reasoning traces.
- Red-Team / Steelman / Handoff / Run-Critic prompts.
- **Pure, unit-tested `rigorScore()`** — claim-source 35 / coverage 20 / red-team 15 / calibration 15 / falsifier 15. Clean ≥70. Strategic/Restructure 80. Open Q&A cap 85.
- **12-case locked test table** for `rigorScore()` reproduces exactly.
- **Planted-unsourced-claim canary fixture** — Verifier catches 100% (goes red if a future model makes it lenient).
- `isQuantOrNamed` classifier is frozen + unit-tested (deterministic; two runs score identically).
**Effort.** 7-10 days.

### Ch.5 — First end-to-end slice (Cash lever playbook)
**Goal.** One real playbook live. Plan-approval → round-table → memo in vault. Usable product.
**PRD outcome.** Outcomes 1, 2, 6 (begin).
**Gates.** Design gate (4 screens: plan-approval, round-table, memo viewer, home stub). "Decide and log" on plan-approval UX detail per Phase R decision #6.
**Exit criteria.**
- Cash lever vs trough analysis playbook fires end-to-end.
- Real Salesforce + AWS + cash-model artifacts read; CFO + COS lenses produce sourced positions.
- Synthesizer drafts memo; Verifier grades; rigor score lands.
- Memo writes to vault via SafeWrite + git.
- **Click any claim → see tool-call result.**
- DRAFT path visible when rigor < 70.
- Round-table UI shows real-time lens activity with substance ribbon (source count, verified citation ratio, coverage %) bound to actual IPC events.
**Effort.** 10-14 days.

### Ch.6 — Write-backs + iterative feedback
**Goal.** Auto-draft proposed write-backs. Russell accepts/edits/rejects/iterates. Library grows.
**PRD outcome.** Outcome 3 (visible compounding loop). Outcome 4 complete (concurrent-edit safety end-to-end).
**Gates.** Design gate (3 screens: review pane, conversation pane per artifact, accepted-history view). "Decide and log" on feedback N (default N=3 per Phase R decision #3).
**Exit criteria.**
- Verifier identifies new positions/decisions/predictions/pre-mortem updates/stakeholder updates/workstream advances derivable from each shipped memo.
- Each surfaces in review pane with diff against any existing artifact.
- Accept flips proposed → active via SafeWrite + git commit.
- Edit opens the markdown directly for hand-editing.
- Reject captures rationale to archived-proposals log.
- Typed feedback re-runs only the contested lens with original context + feedback + prior draft; Verifier re-gates.
- N=3 iteration cap surfaces "commit, reject, or escalate to full re-run."
- Iteration history persists as a thread on the artifact (revision log).
**Effort.** 8-12 days.

### Ch.7 — Eight playbooks + Open Q&A + home screen
**Goal.** Full playbook surface complete. Open Q&A live with quality stamp. Home screen reflects real state.
**PRD outcome.** Outcome 1 complete.
**Gates.** Design gate (batched: 8 playbook tiles, Open Q&A bar, home screen).
**Exit criteria.**
- Each of the 8 V1 playbooks fires its correct lenses, threshold, and stamp (see PRD §6).
- "Stakeholder 1:1 prep" handles missing/stale stakeholder file per Phase R decision #4.
- "Quick multi-lens read" stamps QUICK READ; write-back disabled.
- "Pre-mortem on proposed action" is adversarial-first (Red-Team + Steelman primary; lenses skipped).
- Open Q&A decomposes ad-hoc; memo stamped DECOMPOSED AD-HOC; rigor capped at 85.
- Home screen: today's date + W30 trough proximity; workstream dashboard mini-view; top open decisions; count of proposed write-backs; latest scheduled job outputs; 8 playbook tiles; Open Q&A bar.
**Effort.** 12-16 days.

### Ch.8 — MCP integration
**Goal.** Five V1 MCPs live + PowerBI via `customer-dashboard-poc`. Real data substrate.
**PRD outcome.** Outcomes 1, 2 deepen.
**Gates.** "Decide and log" on PowerBI integration shape per Phase R decision #9 (likely subprocess wrapper with stable interface contract). Design gate if a new auth-flow UX surfaces.
**Exit criteria.**
- Salesforce: OAuth Connected App in Class's org; refresh-token storage in `safeStorage`; typed SOQL builder encoding Connector-Playbook rules (committed = S4+S5+Commit+BestCase; active-AM = `Account_Manager__r` + `IsActive`).
- NetSuite: **TBA tokens active** (Brian's enablement closed); typed SuiteQL builder encoding `foreigntotal` + payroll-blind-spot + 24-month skip rules.
- AWS: SSO profile read via local `~/.aws/`; `class` + `collab` sum rule encoded.
- Gmail: Google OAuth read-only scope; silent refresh.
- Chorus: API key in `safeStorage`; Chorus-only-sourced claims capped <70 confidence and paired with SF/NS.
- PowerBI via `customer-dashboard-poc`: stable interface contract + subprocess fallback; CRO/CPO lenses consume product-usage signal with citable `source_id`.
- Injection-fuzz clean on all typed builders.
- Silent token refresh + re-consent UX for expiry events.
- All credentials in `safeStorage`; **zero plaintext on disk; zero in repo.**
- Renewal-forecast skill audit: fix `Owner.Name` → `Account_Manager__r` + `IsActive` per BLOCKERS B7.
**Effort.** 12-16 days.

### Ch.9 — Cowork execution handoff
**Goal.** "Draw up for Cowork" produces structured execution briefs. Resulting work returns to the vault.
**PRD outcome.** Outcome 8.
**Gates.** Design gate (handoff brief schema; "Draw up for Cowork" UI triggers in memo viewer, decision-log entry, accepted-position card, accepted-pre-mortem card).
**Exit criteria.**
- Handoff Agent (recommended framing: Chief of Staff perspective per Phase R decision #10) produces structured briefs.
- Brief schema: decision being executed (with traceback link), rationale chain, specific deliverables (project plan / business plan / process docs / comms / owner-and-timeline), stakeholder context, workstream context, constraints + risk flags, acceptance criteria, **named Cowork brand skill(s) for any polished artifacts**.
- Brief lands in `handoffs/<date>-<slug>.md` + `handoffs/INDEX.md`.
- Originating artifact gets `executed-by:` back-link pointing to the handoff.
- UI preview before write (Russell sees brief inline; "send to Cowork" persists).
- Cowork-produced execution artifacts (project plans, business plans, process docs) returning to the vault auto-link back to the originating decision.
**Effort.** 6-9 days.

### Ch.10 — Autonomy (scheduled jobs)
**Goal.** Five cron jobs migrate from Cowork. Catch-up logic. Retry semantics. Survives sleep/wake.
**PRD outcome.** Outcomes 5, 6.
**Gates.** Design gate (notification design, job-status surface on home). "Decide and log" on LaunchAgent vs LaunchDaemon per Phase R decision #7 (default: LaunchAgent — user-session jobs are the V1 norm).
**Exit criteria.**
- Five jobs fire on the documented cron:
  - Monday 6am ET — financial tripwire + weekly cash forecast (CFO + COS).
  - Monday 7am ET — stakeholder activity refresh.
  - Sunday 6pm ET — renewal forecast + Chorus sweep (CRO + COS).
  - Sunday 8pm ET — workstream dashboard regenerate + memory consolidation.
  - Daily 6am ET — morning brief (six-lens compact read).
- node-cron + LaunchAgent for survives-sleep/wake-and-restart.
- Catch-up: each missed job runs once at next wake.
- Retry policy per failure type (network, auth-expired, MCP-down).
- Degraded-mode flags ("ran with stale AWS data" / "Gmail OAuth expired — re-consent needed") — never invent missing data.
- Native macOS notification on tripwire flip, memo ready, scheduled-job failure.
- Outputs surface to home screen.
**Effort.** 8-12 days.

### Ch.11 — On-Mac packaging + verification
**Goal.** Unsigned local `.app` install. On-Mac hardening. **All 8 outcome demos pass.**
**PRD outcome.** All.
**Gates.** **On-Mac verification gate — Russell runs the demos on his Mac.** Cannot be skipped or simulated.
**Distribution model.** Single-user personal use only. No App Store, no external distribution, no notarization, no Apple Developer Program required. The unsigned-local-install pattern is sufficient — Russell is the only user on the only machine.
**Exit criteria.**
- electron-builder produces an UNSIGNED `.app` bundle (no signed DMG, no notarization).
- `better-sqlite3` + other native modules rebuild correctly against the Electron ABI (no notarization entitlements required; BLOCKERS B14 reduced scope — only ABI/`electron-rebuild` matters).
- Setup runbook documents the unsigned-local-install pattern:
  1. Build the `.app` via `pnpm build` (or whatever Ch.0 wired) — typically lands at `dist/mac-arm64/C-Suite.app` (or `mac/`).
  2. Drag into `/Applications/` (or run from `dist/` directly — both work for personal use).
  3. Run once: `xattr -dr com.apple.quarantine /Applications/C-Suite.app` — strips Gatekeeper's quarantine flag added on download/copy.
  4. First launch: right-click → Open → confirm "Open anyway" in the Gatekeeper prompt. macOS remembers the approval thereafter.
  5. One-time friction per fresh install or app rebuild.
- Setup runbook also documents: grant Mac permissions (notifications + full-disk-access if vault is outside `~/Documents/`), install Obsidian plugins (Bases per Phase R recommendation), connect MCPs (auth flow per service), vault location verification (non-iCloud — BLOCKERS B9).
- LaunchAgent registration works on unsigned binaries — no change to Ch.10's plist/install path.
- **All 8 PRD §4 outcome demos pass on Russell's Mac:**
  1. Russell opens C-Suite, runs a strategic question, gets a sourced rigor-scored memo.
  2. Click any claim → tool-call result surfaces.
  3. Proposed write-backs surface; Russell accepts → vault updates.
  4. Obsidian open + C-Suite write + Cowork `/deep` — zero data loss; one sidecar on real conflict.
  5. 5 scheduled jobs fire over a week; outputs visible on home.
  6. Menubar + global hotkey + native notification on tripwire flip.
  7. Cowork `/deep` runs against the same vault.
  8. "Draw up for Cowork" produces a brief; brief opened in Cowork; resulting project plan returns to vault auto-linked.
**Effort.** 4-7 days (down from 6-10 — notarization removed).

### Ch.12 *(optional)* — Audit instrumentation & rigor-threshold tuning
**Goal.** First-month rigor-threshold tuning hook. 70-84 audit queue.
**PRD outcome.** Outcome 2 deepens.
**Gates.** None.
**Exit criteria.**
- Rigor threshold is config-tunable (no rebuild required).
- 70-84 audit queue populates; reviewer view surfaces these memos for first-month audit.
- Calibration scorecard accumulates entries for the threshold-tuning decision.
**Effort.** 3-5 days.

---

## Totals

**~90-135 agent-days of parallelized work** across Phases R + 11 chapters (Ch.12 optional).

**First usable product at Ch.5** — Russell can run the Cash lever playbook against real data and get a sourced rigor-scored memo in the vault.

**Critical path:** **NetSuite TBA (Brian)** — kicked off in Phase R, isolated to Ch.8 acceptance so the spine never blocks on it. If TBA slips, Ch.8 ships with NetSuite degraded to skip-and-flag; close on TBA arrival as a post-V1 patch.

**V1 done = all 8 PRD §4 outcome demos pass on Russell's Mac at Ch.11.** Not when chapters check off.

---

## Per-chapter ritual (from `docs/architecture/delivery.md`)

Every chapter runs this ritual:

```
SPEC      Architect: ADR + contract deltas + acceptance criteria
   ↓
[UI only] DESIGN GATE: impeccable design → html-driven-codev mockup → APPROVE
   ↓
BUILD     Runtime / Front-end / Prompt-eng in parallel ≤3 concurrent, code to shared contracts
   ↓
INTEGRATE Orchestrator merges, typecheck + lint
   ↓
TEST      Stub-model harness; unit + integration + e2e + fuzz; zero live inference in CI
   ↓
AUDIT/QA  Independent reviewer (NOT the builder); PASS/FAIL per criterion; security pass; reproduce ≥1 criterion by hand
   ↓
DOCS      Update build-log + relevant architecture docs + this roadmap if discoveries warrant
   ↓
COMMIT    Atomic, well-described, auto-pushed via post-commit hook
```

**No screen is coded before its mockup is approved. No chapter is "done" before Audit/QA independently verifies it.**

---

## Maintenance protocol

`/goal` updates this roadmap when:
- A chapter's effort estimate proves materially wrong (under or over by 50%+) — update the estimate and note the cause in `docs/build-log.md`.
- A discovery in Phase R or mid-chapter shifts a chapter's gates, exit criteria, or sequencing — update and log.
- A BLOCKERS item escalates and changes a chapter's mitigation path — update.

**No silent roadmap changes.** Every change commits with message `roadmap: <what changed> — <why>` and auto-pushes.

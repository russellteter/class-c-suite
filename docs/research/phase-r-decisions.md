# Phase R — 10 Phase 0 Decisions Resolution

> Per `business-planning/C_Suite_CLAUDE.md` §2. Each decision: options considered, recommendation, rationale. Decided under DOCTRINE operating-mode override (decide-and-log default). Russell can override at any chapter boundary by editing this file.

---

## Decision 1 — C-Suite + Cowork concurrent-write resolution

**Question.** Cowork `/deep` is preserved as a fallback per PRD §7 but does not implement SafeWrite. If Cowork writes while a C-Suite scheduled job touches the same workstream file, conflicts can occur. Block Cowork writes, or accept sidecar conflicts?

**Options.**
- (a) Block Cowork writes once the C-Suite ships. Modify Cowork's vault-write tooling to use SafeWrite.
- (b) Accept that occasional sidecar conflicts surface during fallback `/deep` runs. The sidecar pattern handles them.

**Recommendation: (b) — accept sidecar conflicts.**

**Rationale.**
- Modifying Cowork to use SafeWrite is out of the C-Suite's surface area. Cowork is a separate product Russell uses on Anthropic's hosted infrastructure; the C-Suite cannot patch it.
- The sidecar pattern (per `docs/architecture/data.md` §SafeWrite) is the asymmetric-safety mechanism — the C-Suite always uses SafeWrite; if Cowork writes between C-Suite read and C-Suite write, the C-Suite writes `.proposed-<ts>.md` and Russell merges manually.
- Cowork usage is expected to drop sharply once the C-Suite ships (PRD §4 outcome 1). Sidecar conflicts will be rare, not constant.
- R2 verified (B8 in `docs/research/R2-feasibility-notes.md`): "sidecar pattern is sufficient; one gap documented" (Ch.2 must implement file-mtime/SHA check at write time).

**Applies at.** Ch.2 (SafeWrite design), Ch.5 (first-slice operations).
**Spec patch.** None needed beyond existing BLOCKERS B8 mitigation.

---

## Decision 2 — Verifier prompt anti-sycophancy heuristics

**Question.** What concrete prompt patterns prevent the Verifier from rubber-stamping the Synthesizer's memo?

**Recommendation.** Apply all five patterns simultaneously, per `docs/architecture/prompts.md` §Verifier (already drafted) + R2 verification of B3:

1. **Structural isolation from lens reasoning traces** (B3 mitigation). The Verifier input assembler fails closed if any input outside `{draft, structured outputs, audit trail, position metadata, Red-Team output, Steelman output}` is present. Assertion throws `VerifierInputContractViolation`.
2. **Forced JSON output schema with mandatory falsifiers + missing-data flags**. Verifier's required JSON shape (in prompts.md lines 226-269) cannot return null on `falsifier.present` or `claim_source.claims_verified`. Zod rejects malformed returns.
3. **Higher-reasoning model than the lenses**. Default: Opus 4.7 for Verifier (per `docs/architecture/runtime.md` line 159), Sonnet 4.6 for lenses. Confirmed in R2 (B5 verified).
4. **Schema-rejection of null returns on required fields**. The Verifier's structured output schema treats `null` as a parse failure for every required field.
5. **Planted-claim canary fixture as permanent CI guard**. `tests/fixtures/canary-memo.md` contains a deliberately unsourced quantitative claim. `tests/verifier-canary.spec.ts` MUST fail if the Verifier passes the canary (per `docs/architecture/prompts.md` lines 436-453). Runs every CI build.

**Plus the NAMED_ENTITY_REGISTRY pre-load** (R2 verification of B3 surfaced this gap): registry of Class-specific entities (stakeholder names, product names, competitor names, AWS profile names) must be pre-loaded at utility-process startup from the vault + turnaround library, cached, and consulted by `isQuantOrNamed()` to detect named-entity claims that require citation. Ch.4 architect owns building this.

**Reference literature.** Silicon Mirror paper + Anthropic's CitationAgent pattern (per C_Suite_CLAUDE.md §2 #2) inform the structural design but the specific patterns above are the implementation.

**Applies at.** Ch.4 (Verifier prompt + input contract); permanent CI from Ch.4 forward.
**Spec patch.** Add NAMED_ENTITY_REGISTRY requirement to `docs/architecture/prompts.md` (see Spec Patches section).

---

## Decision 3 — Iterative feedback convergence rule

**Question.** After how many rounds of iteration without convergence does the system surface "commit / reject / escalate to full re-run"?

**Recommendation: N = 3.**

**Rationale.**
- Default in CLAUDE.md §2 #3.
- Tracked in PRD §5 as a locked principle pending the N value.
- After 2 rounds without convergence, the lens is unlikely to converge with the 3rd unless context fundamentally shifts.
- Round-3 escalation gives Russell three forks: commit-as-is, reject, or escalate to full multi-lens re-run (which provides fresh adversarial pressure).
- Codified in `docs/architecture/data.md` §iterateOnWriteback() function.

**Applies at.** Ch.6 (iterative feedback engine).
**Spec patch.** None needed — already coded in data.md.

---

## Decision 4 — Playbook missing-prerequisite handling

**Question.** For each of the 8 V1 playbooks, what happens when a required artifact is missing or stale?

**Recommendation per playbook.**

| Playbook | Missing-prereq behavior | Stale-prereq behavior |
|---|---|---|
| **Cash lever vs trough analysis** | Block if NetSuite cash data unreachable; degrade if PowerBI unavailable (CRO lens degraded-flag) | Cash data >24h: surface "stale by N hours" banner in memo header; do not block |
| **Stakeholder 1:1 prep** | If stakeholder file missing: auto-draft a minimal stakeholder skeleton from name+role; flag as "skeleton-only" in memo header; do not block | Stale >30d: run with degraded context, flag "stakeholder file last refreshed N days ago" |
| **Quick multi-lens read** | Skip lens whose required artifact missing; flag in QUICK READ stamp | Run with stale; flag |
| **Pre-mortem on proposed action** | Adversarial-first; no required prereq beyond the proposed-action description | N/A — pre-mortems are inherently fresh |
| **GTM resource reallocation** | If Salesforce auth expired: surface re-consent prompt; do not run | Stale Salesforce data >24h: flag; do not block |
| **Strategic option evaluation** | Block if Salesforce + AWS + cash data not all available | Stale >7d on any source: flag with banner; do not block |
| **Board narrative prep** | Block if any of {Salesforce, NetSuite, PowerBI, calibration} unavailable | Stale: flag with severity banner; do not block |
| **Restructure decision** | Block if Salesforce + NetSuite + cash model unavailable | Stale >7d: flag; do not block |

**Default rule:** **degrade-and-flag** for all soft prereqs (stale data, optional sources). **Block-and-surface** only for the hardest cases (Strategic option / Board narrative / Restructure when the spine is unavailable). Russell's preference (per CLAUDE.md): never invent missing data; always flag with explicit reason.

**Applies at.** Ch.5 (Cash lever first slice), Ch.7 (eight playbooks complete), Ch.8 (MCP error-handling integration).
**Spec patch.** Codify the table above in `docs/architecture/prompts.md` as a per-playbook precondition matrix.

---

## Decision 5 — Scheduled job error/retry semantics

**Question.** What happens when NetSuite is unreachable at 6 AM Monday's tripwire scan? When AWS SSO has expired during Sunday's renewal sweep? When Gmail OAuth was revoked overnight before the morning brief?

**Recommendation per failure type.**

| Failure type | Retry policy | Degraded-mode behavior | Failure-notification rule | Escalation |
|---|---|---|---|---|
| **Network timeout** (5xx, connection error) | Exponential backoff: 30s, 2m, 10m. Max 3 retries. | If all retries fail: run job with available data, flag missing source. | Native notification only on 3rd retry failure. | If 3 consecutive scheduled fires fail: surface as P2 alert in home-screen job-status strip. |
| **Auth expired** (OAuth refresh fails, SSO expired) | NO automatic retry — auth requires browser interaction. | Run job with degraded sources, flag `auth_expired: <service>` in memo. | Immediate native notification: "Reconnect <service> to restore <job>". | After 7 days of expired auth: P1 alert in home-screen. |
| **MCP-down** (Anthropic service unreachable, MCP server crashed) | Exponential backoff: 1m, 5m, 30m. Max 3 retries. | Degraded mode: skip the MCP-dependent lens, flag in synthesis. | Native notification on 3rd retry failure. | If MCP is down for >24h: P2 alert; runs continue with reduced lens coverage. |
| **Vault unreachable** (file-system error, disk full) | Retry 3× with 10s spacing. | If still failing: HALT the job entirely; do not partial-write. | Immediate native notification. | If vault remains unreachable for >1h: P0 alert — cannot operate. |
| **Vault git commit fails** (rare — corruption, permissions) | No retry. | Continue with file written; queue git-commit-retry every 5m. | Native notification only if 6 consecutive commit failures. | Log to `.git/auto-push.log`-equivalent in app data; surface in Settings → Diagnostics. |

**B32 (AWS SSO mid-job)** specific addition per R1-Remaining: Ch.10 must implement (a) preflight token-expiry check before AWS job starts, (b) graceful degradation when expired (skip AWS section, surface re-login prompt), (c) do not abort the full brief on AWS failure alone.

**Applies at.** Ch.10 (autonomy job orchestration).
**Spec patch.** Add the table above to `docs/architecture/runtime.md` §Error handling.

---

## Decision 6 — Plan-approval UX per playbook

**Question.** PRD locks plan-approval as universal. In practice, "Quick multi-lens read" at 8:55 AM before a 9:00 AM meeting is not friction-friendly. Universal with auto-approve countdown, or per-playbook config?

**Recommendation: per-playbook config with sensible defaults.**

| Playbook | Plan-approval mode | Rationale |
|---|---|---|
| **Strategic option evaluation** | Universal manual approval (no countdown) | High-stakes; Russell reviews plan |
| **Restructure decision** | Universal manual approval | Highest-stakes |
| **Board narrative prep** | Universal manual approval | External-stakeholder facing |
| **Cash lever vs trough** | Universal manual approval | High-stakes (cash) |
| **GTM resource reallocation** | 30-second auto-approve countdown | Important but expected pattern |
| **Pre-mortem on proposed action** | 30-second auto-approve countdown | Russell drove the prompt; less plan-review needed |
| **Stakeholder 1:1 prep** | 5-second auto-approve countdown | Time-pressured; pre-meeting |
| **Quick multi-lens read** | Inline (no plan screen) | Friction-free; QUICK READ stamp enforces quality signal |

**Open Q&A:** 10-second auto-approve countdown (the lens fan-out is decomposed at plan time; Russell sees that decomposition).

**Surfacing.** A per-playbook setting in Settings → Playbooks lets Russell change any of these without rebuild.

**Applies at.** Ch.5 (plan-approval screen), Ch.7 (per-playbook settings).
**Spec patch.** Add the table to `docs/architecture/ui.md` §plan-approval screen.

---

## Decision 7 — Daemon edge cases (LaunchAgent vs LaunchDaemon)

**Question.** Specify behavior for: Mac restart while C-Suite was running; user force-quit; Mac shutdown for several days (catch-up); user not logged in when scheduled job fires; sleep during a long-running job.

**Recommendation: LaunchAgent (user-session) with the following behaviors.**

| Edge case | Behavior |
|---|---|
| **Mac restart while running** | LaunchAgent re-launches C-Suite at next login. In-flight run resumes from SQLite checkpoint (Ch.3 spec). User sees notification: "C-Suite resumed run <run_id> from checkpoint." |
| **User force-quit** | LaunchAgent does NOT auto-restart (respect user intent). Next manual launch resumes from checkpoint if a run was in-flight. |
| **Mac shutdown for several days** | At next login: catch-up logic fires each missed scheduled job ONCE (not N times). Order: most-recent-first. Surface in home-screen: "Caught up 3 missed jobs from <date range>." |
| **User not logged in when scheduled job fires** | LaunchAgent only runs while user session is active. Missed jobs caught up at next login (above). Per R2: LaunchDaemon would run as root, no Keychain access, no display — wrong pattern. |
| **macOS sleep during long-running job** | Job pauses at the SQLite checkpoint; resumes on wake. If wake takes >1h, surface "Run paused for sleep; resuming now" notification. If wake interrupts mid-MCP-call, the MCP call is retried per Decision 5. |

**Applies at.** Ch.10 (LaunchAgent registration + catch-up logic + sleep/wake survival).
**Spec patch.** Codify in `docs/architecture/delivery.md` §autonomy.

---

## Decision 8 — Run cost transparency

**Question.** Where in the UI does per-run cost surface?

**Recommendation: three surfaces, all token-based not USD (per B5 verification).**

1. **Memo header (per-run):** "Tokens: 87,432 in / 12,108 out · Window remaining: 92K · ~ $1.42 API-equivalent" — the dollar figure is a reference-only tooltip explaining it's API-equivalent not actual charge (Max subscribers pay flat).
2. **Home-screen daily cumulative meter:** "Today: 312K tokens · Window cap: 360K · 48K remaining" — surfaces window-pressure when planning the next run.
3. **Settings → Diagnostics (per-playbook average):** 7-day rolling average tokens per playbook. Helps Russell calibrate which playbooks are cheap (Quick Read ~15K) vs expensive (full Board Narrative ~120K).

**Rationale.**
- Per R2 B5: SDK exposes `result.usage.total_cost_usd` but that's API-pricing-equivalent on Max, NOT subscription-credits-remaining. Display as reference figure only.
- The token-based meter is the operationally relevant signal (window-cap pressure).
- Russell can decide to defer non-urgent runs when window-remaining drops.

**Applies at.** Ch.1 (cost-meter wiring), Ch.5 (memo header surface), Ch.7 (home screen).
**Spec patch.** Update `docs/architecture/ui.md` cost-meter section with the three-surface rule.

---

## Decision 9 — PowerBI integration via customer-dashboard

**Question.** Three options: (a) import patterns directly, (b) subprocess with stable tool interface, (c) wrap as new MCP. Pick one with rationale.

**Recommendation: (b) — Python subprocess with stable JSON-over-stdout tool interface.**

**Rationale (from `docs/research/R0-customer-dashboard-readout.md`).**
- The customer-dashboard project is 43K LOC Python with 2,654 passing tests, full CI/CD. Importing into the C-Suite (option a) would couple Node/Electron to pandas, rapidfuzz, pyarrow, openpyxl — lose the pytest test net.
- Wrapping as an MCP server (option c) is over-engineered for V1 (no additional consumers).
- The `-j` JSON-export flag already exists in `customer-dashboard/src/main.py` — clean tool contract today.
- Subprocess pattern is already validated by the project's own CI deploy flow.
- Failure isolation is a direct benefit: if Python crashes, the C-Suite utility process catches + retries + flags degraded.

**Confirmed caveats (R0-Code):**
- Power BI data is NOT live-queryable from C-Suite — Power Automate exports CSVs weekly from a separate schedule. C-Suite reads pre-exported CSVs. Data age must be surfaced.
- Google Sheets requires `token.pickle` seeded interactively by Russell once at setup. Preflight must verify token file exists + is fresh.
- Cold start: 10-45 seconds. Subprocess on schedule, not per-session.
- `-j` exports raw DataFrame; template-ready `_prepare_records()` shape diverges. C-Suite Zod validates only the 15 fields it uses + `passthrough()` for the rest.

**Credential handling:** customer-dashboard manages its own auth (Power BI = file reads, no auth; Google Sheets = `token.pickle`). The C-Suite's `safeStorage` is NOT used for customer-dashboard credentials. Setup runbook documents the `token.pickle` seed step.

**Per-playbook consumption** (per `docs/architecture/mcp.md` §PowerBI table, validated by R1-Remaining):
- GTM reallocation: per-segment ARR + engagement → cite as `pbi-segment-usage-<segment>`
- Strategic option: top-10 ARR usage health → `pbi-account-health-<accountId>`
- Board narrative: NRR by cohort + churn-risk count → **NRR must be computed in Synthesizer layer from per-account `arr_usd` + `renewal_urgency` + `days_until_renewal`** (NOT pre-computed in customer-dashboard output) — R1-Remaining Patch 9.
- Quick multi-lens read (customer-relevant): per-account spot → `pbi-account-spot-<accountId>`

**Applies at.** Ch.8 (PowerBI integration), Ch.11 (setup runbook with Python+venv prerequisite per B18).
**Spec patches.** Per R1-Remaining Patch 8-10 to `docs/architecture/mcp.md` §PowerBI.

---

## Decision 10 — Cowork execution handoff format

**Question.** Define: (a) brief schema, (b) where briefs land, (c) UI surfaces that carry "Draw up for Cowork" trigger, (d) which agent role drives the Handoff Agent, (e) inline-preview-or-just-write behavior, (f) what happens to Cowork-produced execution artifacts.

**Recommendation.**

### (a) Brief schema (markdown with YAML frontmatter)

```yaml
---
type: handoff
id: HANDOFF-<YYYY-MM-DD>-<slug>
decision_id: DEC-<N>       # OR memo_id: <memo-path>
created: <YYYY-MM-DD>
cowork_brand_skills:        # named skills Cowork should invoke for polished artifacts
  - class-brand-presentations    # .pptx output
  - class-brand-excel             # .xlsx output
status: drafted             # drafted | sent | executed
---

# <Decision title> — Execution Brief

## Decision being executed
<Verbatim from DEC-<N> + traceback link>

## Rationale chain
<Why this choice over alternatives, sourced from the originating memo>

## Specific deliverables Cowork should produce
- [ ] <Deliverable 1> (e.g., "Project plan for Q3 turnaround in .docx using class-brand-document")
- [ ] <Deliverable 2> (e.g., "Executive summary deck (10 slides) using class-brand-presentations")

## Stakeholder context
<Who's involved, who has decision rights, who needs comms>

## Workstream context
<Which workstreams touch; what depends on this>

## Constraints + risk flags
<Budget, timing, dependencies, tripwires>

## Acceptance criteria
<What "done" looks like>

## Owner + timeline
<Person + dates>
```

### (b) Landing location
- Brief: `<vault>/handoffs/<YYYY-MM-DD>-<slug>.md`
- Index: `<vault>/handoffs/INDEX.md` — Cowork scans this to discover new briefs

### (c) UI surfaces with "Draw up for Cowork" trigger
- Memo viewer header (when memo has a committed decision)
- Decision log entry card
- Accepted position card
- Accepted pre-mortem card
- **NOT** on: predictions, stakeholder updates, workstream advances — these aren't actions to execute

### (d) Agent role driving Handoff Agent framing
**Chief of Staff perspective** (recommended per C_Suite_CLAUDE.md §2 #10). Executor-framing is its native domain. Avoid creating a dedicated 6th lens role just for this.

### (e) Inline preview before write
**Preview first, then write.** Russell sees the brief inline ("Send to Cowork" CTA at the bottom); on confirmation, brief writes to `handoffs/` via SafeWrite + git commit. Russell can edit the preview inline before sending.

### (f) Cowork-produced artifacts return
- Cowork writes project plans, business plans, process docs back into the vault under `executions/<decision-id>/<artifact-name>`.
- The originating decision's frontmatter auto-updates: `executed_by: executions/<decision-id>/<index>`. SafeWrite handles the write.
- The C-Suite's chokidar re-indexes; next run sees the execution via the `executed_by:` field.
- The C-Suite UI surfaces a "Linked execution" section on the decision card when `executed_by` is populated.

**Applies at.** Ch.9 (handoff agent, schema, UI surfaces, return loop).
**Spec patches.** This decision is the source-of-truth for `docs/architecture/prompts.md` §Handoff + `docs/architecture/data.md` HandoffFrontmatter + `docs/architecture/ui.md` Handoff preview screen. Update those to reflect this decision verbatim.

---

## Summary

All 10 decisions resolved under DOCTRINE operating-mode override (decide-and-log default). None are genuine product-shape forks requiring Russell's pre-build approval. Russell can override any at any chapter boundary by editing this file.

**Decisions that touch multiple chapters:**
- Decision 2 (Verifier) → Ch.4 (primary), permanent CI gate
- Decision 4 (missing-prereq matrix) → Ch.5, Ch.7, Ch.8
- Decision 5 (job error/retry) → Ch.10 (primary)
- Decision 9 (PowerBI subprocess) → Ch.8 (primary), Ch.11 (setup)
- Decision 10 (handoff) → Ch.9 (entire chapter is the implementation)

**Spec-patch checklist for Ch.0 architect** (folded into architecture-spec patches batch):
- [x] `docs/architecture/prompts.md` — add NAMED_ENTITY_REGISTRY requirement
- [x] `docs/architecture/prompts.md` — add per-playbook precondition matrix
- [x] `docs/architecture/runtime.md` — expand Error handling table per Decision 5
- [x] `docs/architecture/ui.md` — plan-approval per-playbook table
- [x] `docs/architecture/ui.md` — cost-meter three-surface rule
- [x] `docs/architecture/mcp.md` — apply R1-Remaining patches 1-10
- [x] `docs/architecture/data.md` — HandoffFrontmatter per Decision 10
- [x] `docs/architecture/delivery.md` — daemon edge cases per Decision 7

---

*Russell's review (when desired):* edit this file; commit; the next /goal cycle reads from here.

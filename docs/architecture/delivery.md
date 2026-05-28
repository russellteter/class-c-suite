# Build Methodology + Delivery

> Build-team roles. Per-chapter ritual. Repo tree. Stub-model harness. Test/coverage strategy. Security threat model. Packaging + notarization + setup runbook. The eight V1 on-Mac outcome demos.

## Build-team roles (sub-agent specializations `/goal` dispatches)

`/goal` is the orchestrator. It decomposes each chapter and dispatches specialized sub-agents from the list below. **Writer ≠ grader is enforced structurally** — Audit/QA is a separate sub-agent from the builders.

| Role | Sub-agent | Typical model | When dispatched |
|---|---|---|---|
| **Architect** | `Plan` or `Backend Architect` | Opus 4.7 | Per chapter spec; ADR drafting; contract changes |
| **Design (impeccable)** | `UI Designer` + `impeccable` skill | Sonnet 4.6 | UI chapter design phase before mockup gate |
| **HTML-codev (mockups)** | direct execution + `html-driven-codev` skill | n/a (orchestrator-driven) | UI chapter mockup-gate sequencing |
| **Front-end** | `Frontend Developer` | Sonnet 4.6 | React + design-tokens implementation |
| **Runtime** | `engineering-senior-developer` or general-purpose | Sonnet 4.6 | Electron / Node / SDK / SQLite / SafeWrite |
| **Prompt-eng** | direct execution + `claude-api` skill | Sonnet 4.6 | Lens/Synth/Verifier/RT/SM prompts; rigor formula |
| **Test** | `full-stack-orchestration:test-automator` or general-purpose | Sonnet 4.6 | TDD via `superpowers:test-driven-development` |
| **Audit/QA** | `EvidenceQA` or `testing-reality-checker` | Sonnet 4.6 | Independent acceptance review — NEVER the same as the builder |
| **Docs** | direct execution | n/a | build-log + architecture-doc updates |

**Default model for sub-agents: Sonnet 4.6** per `~/.claude/CLAUDE.md` cost discipline. Opus 4.7 only when the task genuinely needs Opus-level reasoning (Architect across many files; Verifier production runs; multi-step ambiguous decomposition).

## Per-chapter ritual

Every chapter (Ch.0 through Ch.11) runs the same nine-step ritual:

```
1. SPEC
   Architect drafts/updates the chapter ADR + contract deltas + acceptance
   criteria. Commits to docs/architecture/decisions/ADR-NNN-<slug>.md.

2. [UI only] DESIGN GATE
   UI Designer produces design with impeccable critique. HTML-codev produces
   mockup at ~/Desktop/cstuite-design-step-N.html per ui.md §12-step. Russell
   approves (persists to markdown). NO screen code before approval.

3. PARALLEL BUILD
   Runtime / Front-end / Prompt-eng dispatched in parallel (≤3 concurrent).
   Each codes to the shared contracts from step 1. Test author dispatched
   alongside writing TDD tests against the same contracts.

4. INTEGRATE
   Orchestrator merges branches; runs typecheck + lint. Resolves conflicts
   (always with --ours preserving the post-merge code per
   ~/.claude/rules/post-squash-merge-fresh-branch.md when applicable).

5. TEST
   Test sub-agent runs full suite against stub-model harness. Zero live
   inference in CI. Coverage gates per below.

6. INDEPENDENT AUDIT/QA
   Audit/QA sub-agent (NOT a builder) re-derives PASS/FAIL per acceptance
   criterion. Performs security pass (secrets-in-repo grep; CSP review;
   SafeWrite invariant check). Reproduces ≥1 acceptance criterion BY HAND
   (no automation) — proves the criterion describes real-world behavior.

   INTEGRATION PROOF (mandatory for any chapter that produces a UI surface,
   an MCP wiring, or an end-user-visible flow): the Audit/QA sub-agent must
   run the assembled artifact end-to-end and capture evidence in the
   build-log before the chapter can close. For a UI chapter that means a
   runnable `pnpm dev` Electron window with the chapter's screen(s)
   RENDERED + screenshotted (capture via webContents.capturePage()), not
   merely screens passing in jsdom. For an MCP chapter that means a live
   (or LIVE_CONNECTORS-gated) smoke call against the real client with the
   result logged, not merely a mocked unit spec. jsdom-only unit specs and
   mock-only MCP specs are NECESSARY BUT NOT SUFFICIENT. This requirement
   exists because the Ch.7 assembly leg shipped "complete" on +372 green
   jsdom specs while the screens were never bundled into a runnable app
   (B46, 2026-05-28).

7. DOCS
   Orchestrator updates docs/build-log.md (Ch.N entry per the build-log
   template). Updates docs/architecture/ if discoveries warrant. Updates
   ROADMAP.md effort estimates if reality diverged.

8. COMMIT
   Atomic commits per concept (multiple commits per chapter normal).
   Conventional message format. Auto-pushed via post-commit hook.

9. CLOSE
   /goal verifies all chapter acceptance criteria PASS in Audit report.
   Marks chapter complete in build-log. Reads next chapter's gates.
```

**No chapter is closed before Audit/QA independently verifies every acceptance criterion.** Self-attested PASS by the builder does not close a chapter. **"Tests green" is not "chapter done"** — a chapter producing a UI/MCP/end-user-visible surface stays open until the INTEGRATION PROOF in step 6 is captured in the build-log.

## Repo tree

```
c-suite/
├── PURPOSE.md          DOCTRINE.md   ROADMAP.md
├── RESEARCH.md         BLOCKERS.md   README.md
├── CLAUDE.md
├── package.json        pnpm-workspace.yaml   tsconfig.json
├── .gitignore          .git/hooks/post-commit
├── electron-builder.yml
├── apps/
│   ├── main/                                 # Electron main process
│   │   ├── src/
│   │   │   ├── main.ts                       # app lifecycle, tray, hotkey
│   │   │   ├── ipc/                          # typed IPC handlers
│   │   │   ├── notifications/                # native notifications
│   │   │   ├── safeStorage/                  # Keychain wrapper
│   │   │   ├── launchAgent/                  # plist registration (Ch.10)
│   │   │   └── vaultWatcher/                 # chokidar (Ch.2)
│   │   └── package.json
│   ├── utility/                              # Electron utility process
│   │   ├── src/
│   │   │   ├── orchestrator/                 # state machine + agent dispatch (Ch.3)
│   │   │   ├── agents/                       # AgentDefinitions (Ch.3,4)
│   │   │   ├── scheduler/                    # token-budget scheduler (Ch.1)
│   │   │   ├── safeWrite/                    # SafeWrite primitive (Ch.2)
│   │   │   ├── writeback/                    # write-back engine (Ch.6)
│   │   │   ├── mcps/                         # one client per service (Ch.8)
│   │   │   │   ├── salesforce/
│   │   │   │   ├── netsuite/
│   │   │   │   ├── aws/
│   │   │   │   ├── gmail/
│   │   │   │   ├── chorus/
│   │   │   │   └── powerbi/                  # via customer-dashboard-poc subprocess
│   │   │   ├── scoring/                      # rigorScore + isQuantOrNamed (Ch.4)
│   │   │   ├── handoff/                      # Ch.9
│   │   │   ├── jobs/                         # 5 scheduled jobs (Ch.10)
│   │   │   └── prompts/                      # lens/synth/verifier/RT/SM/handoff/critic
│   │   └── package.json
│   └── renderer/                             # React app
│       ├── src/
│       │   ├── screens/                      # Home, PlanApproval, RoundTable,
│       │   │                                   MemoViewer, WritebackPane,
│       │   │                                   HandoffPreview, Settings, RunHistory
│       │   ├── components/                   # design-system primitives + composites
│       │   ├── design/tokens.css             # CSS variables (ui.md)
│       │   ├── ipc/                          # IPC subscription hooks
│       │   └── index.tsx
│       └── package.json
├── packages/
│   ├── shared-types/                         # Zod schemas + types shared across procs
│   │   └── src/
│   │       ├── vault-schemas.ts              # PositionFrontmatter, etc. (data.md)
│   │       ├── ipc.ts                        # IpcMessage discriminated union
│   │       └── domain.ts                     # PlaybookId, AgentRole, etc.
│   ├── stub-harness/                         # records/replays SDK responses for tests
│   └── soql-builder/                         # typed SOQL/SuiteQL (mcp.md)
├── db/
│   ├── migrations/                           # NNN_<name>.sql per data.md
│   └── runtime.schema.ts                     # better-sqlite3 wrappers
├── tests/
│   ├── unit/                                 # vitest
│   ├── integration/                          # full IPC round-trips with stub-harness
│   ├── fuzz/                                 # SafeWrite concurrent-write fuzz (Ch.2)
│   ├── e2e/                                  # Playwright over renderer (Ch.5+)
│   └── fixtures/                             # canned vault, canned tool results,
│                                               canary memo, 12-case rigor table
├── docs/
│   ├── architecture/                         # this file + 5 siblings + decisions/
│   ├── research/                             # Phase R outputs (R0/R1/R2 reports)
│   ├── decisions/                            # ADR-NNN-*.md (per-chapter)
│   └── build-log.md
├── business-planning/                         # mirror of vault source-of-truth corpus
└── scripts/
    ├── verify-vault.ts                        # iCloud-sync pre-flight (B9)
    ├── send-tba-request.md                    # template Russell adapts for Brian (B1)
    └── setup-runbook.md                       # Ch.11 setup discipline
```

## Stub-model harness

CI **never** runs live Claude inference. The stub harness records SDK responses during a real development run, then replays them during tests.

```typescript
// packages/stub-harness/src/stub.ts
type StubMode = 'live' | 'record' | 'replay';

export class StubClaudeClient {
  constructor(private mode: StubMode, private fixtureDir: string) {}
  async invoke(definition: AgentDefinition, context: ContextBundle): Promise<AgentOutput> {
    if (this.mode === 'live') return realSdkInvoke(definition, context);
    const key = stableHash(definition.role, context);
    if (this.mode === 'record') {
      const out = await realSdkInvoke(definition, context);
      await this.persistFixture(key, { definition, context, out });
      return out;
    }
    // replay
    return this.loadFixture(key);
  }
}
```

CI sets `STUB_MODE=replay`. Tests load canned fixtures from `tests/fixtures/`. Developer runs against real Claude with `STUB_MODE=live` and can record new fixtures with `STUB_MODE=record`.

## Test and coverage strategy

| Layer | Framework | Coverage gate | What it tests |
|---|---|---|---|
| **Unit** | vitest | ≥80% line coverage of `src/` | Pure functions: rigorScore, isQuantOrNamed, SafeWrite, SOQL builder, write-back engine |
| **Integration** | vitest + stub-harness | ≥70% of cross-process flows | Full state-machine transitions on stubs; IPC round-trips |
| **Fuzz** | custom harness | N/A (passes/fails on data-loss invariant) | SafeWrite concurrent-write under simulated Obsidian + Cowork + C-Suite (Ch.2 acceptance) |
| **E2E** | Playwright over Electron | smoke per playbook | One Russell-journey per playbook: plan-approve → run → memo → write-back accept |
| **Verifier canary** | vitest | must PASS on every CI | Planted-unsourced-claim catches (prompts.md §canary) |
| **Rigor formula locked table** | vitest | must PASS on every CI | 12-case table in prompts.md reproduces exactly |

CI pipeline (GitHub Actions):

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest  # CI does NOT need macOS — no Electron sign/notarize in CI
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test:unit
      - run: pnpm test:integration
      - run: pnpm test:fuzz       # Ch.2+
      # E2E + sign/notarize run locally on Russell's Mac (Ch.11)
```

## Security threat model

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Secret leaked to git / disk plaintext | Medium | Catastrophic | `safeStorage` only; pre-commit grep for known secret patterns; `.gitignore` covers `.env*`; CI runs `gitleaks` |
| Renderer XSS / RCE | Low | High | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, strict CSP, no `eval` |
| MCP injection (SOQL/SuiteQL) | Medium | High | Parameterized typed builders; injection-fuzz test in Ch.8 acceptance |
| Verifier rubber-stamp | High if unchecked | Catastrophic (trust gone) | B3 enforcement: input-contract assembler fails closed; planted-claim canary on every CI |
| Concurrent-write data loss | High if unchecked | Catastrophic (institutional state) | SafeWrite + fuzz test (B8 + Ch.2 acceptance) |
| iCloud / Time Machine corrupts atomic rename | Medium | High | Pre-flight check refuses to run if vault is iCloud-synced (B9) |
| Notarization fails due to native modules | Medium | Blocks ship | electron-rebuild pinned; throwaway notarization test mid-Ch.8 (B14) |
| Audit trail leaks SF/NS data on git push | Low | Medium | SQLite-local audit (B16); never in vault git |
| Token-refresh failure surfaces as silent skip | Low | Medium | Always emit `mcp.auth.expired` + native notification; never silent |

## electron-builder packaging (Ch.11)

```yaml
# electron-builder.yml
appId: com.classedu.csuite
productName: C-Suite
artifactName: "${productName}-${version}-${arch}.${ext}"
directories:
  output: dist
mac:
  category: public.app-category.productivity
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  notarize:
    teamId: ${env.APPLE_TEAM_ID}
dmg:
  sign: false
afterSign: scripts/notarize.cjs
```

**Notarization** uses Apple's `notarytool` via the `@electron/notarize` library. Apple ID, team ID, and app-specific password in environment (NEVER committed); orchestrator surfaces to Russell during Ch.11 setup.

**electron-rebuild pinned** to Electron version in `package.json`. `better-sqlite3` rebuilds against the target Electron's Node ABI on `pnpm install`. Throwaway notarization test mid-Ch.8 catches native-module entitlement issues early (B14).

## Setup runbook (Ch.11 deliverable)

The setup runbook is `scripts/setup-runbook.md`. It walks Russell through:

1. **Install the notarized DMG.** Drag C-Suite.app → /Applications. First launch: grant macOS permissions (notifications, file access, automation if needed).
2. **Configure the vault path.** Defaults to `/Users/russellteter/Documents/Claude/Projects/Business Planning/`. **Pre-flight check verifies the path is not iCloud-Drive-synced.** If iCloud-synced, runbook walks the move-to-non-iCloud step (B9).
3. **Install required Obsidian plugins.** Per Phase R Track D recommendation — likely Bases (current), Templater, possibly Dataview if still required.
4. **Connect MCPs in sequence.** Per service:
   - Salesforce: PKCE OAuth flow in browser → token saved to `safeStorage`.
   - NetSuite: **TBA tokens** (Russell pastes the four tokens Brian issued — B1 closure point).
   - AWS: confirm `class` + `collab` SSO profiles are configured locally; the C-Suite reads them automatically.
   - Gmail: Google OAuth read-only consent.
   - Chorus: paste API key.
   - PowerBI via customer-dashboard-poc: per Phase R decision — most likely subprocess wrapper config.
5. **Register the LaunchAgent.** One-click toggle in Settings; writes `~/Library/LaunchAgents/com.classedu.csuite.plist`.
6. **Fill the 7 Day-Zero forms** (per `ui.md` Day-Zero wizard). Each form can be deferred; deferred forms cause the dependent skill to run with documented assumption.
7. **Run the eight outcome demos** (below) to verify V1-done.

## The eight V1 on-Mac outcome demos (Ch.11 acceptance — Russell runs on his Mac)

These are not automated tests. Russell runs each on his Mac and observes the outcome. PASS = the outcome matches PRD §4. FAIL = surface and fix.

### Demo 1 — Primary surface
Russell opens the C-Suite from the menubar. Types: "Should we shift our W30 trough mitigation from line-of-credit draw to deferred AWS spend?" Plan-approval surfaces; he approves. Cash-lever playbook runs. Memo lands in the vault with sourced rigor-scored content. **PASS** if Russell would choose to open C-Suite for the next similar question instead of Cowork.

### Demo 2 — Sourced rigor
Russell opens the memo from Demo 1. He clicks the claim "Q3 AWS spend was $437K." The UI shows the underlying `aws_cost_explorer` tool call: args, result JSON (full), source_id. **PASS** if every numerical claim in the memo can be clicked to its tool-call result.

### Demo 3 — Visible compounding loop
Russell opens the Write-Back Review pane after Demo 1. Sees proposed: 1 new position (about AWS deferral leverage), 1 new prediction (cash position at W30 under each lever), 1 stakeholder-activity update on Brian (if Brian-relevant), 1 workstream advance on WS-04 (cash). Russell accepts the position (flips proposed → active in `positions/`). Edits the prediction (opens in markdown for direct edit). Rejects the workstream advance with a one-line rationale. Provides typed feedback on the stakeholder update; the relevant lens re-runs with feedback; a revised draft appears. **PASS** if all four flows produced their intended vault outcome with one git commit per acceptance.

### Demo 4 — Vault concurrent-edit safety
Russell opens `positions/POS-2026-014-aws-deferral-leverage.md` in Obsidian. Leaves Obsidian editing. In a separate terminal, Russell runs Cowork `/deep` on a related question that touches the same position. Simultaneously, the C-Suite Sunday-evening dashboard-regen job touches the same file. **PASS** if zero data loss; one `.proposed-<ts>.md` sidecar surfaces; Russell merges manually with no surprise.

### Demo 5 — Unattended autonomy
Russell goes a full week without thinking about it. Each scheduled job fires on its cron. Outputs surface on the home screen with timestamps. Native notifications fire on tripwire flips. **PASS** if Russell can spend a week away from the C-Suite and come back to a current operational picture.

### Demo 6 — Native feel
Russell uses the global hotkey to summon the C-Suite while another app is focused. A tripwire flips during a memo run; the native macOS notification surfaces and links back to the C-Suite. Russell puts the Mac to sleep mid-run; on wake, the run continues from its checkpoint (or surfaces an explicit "run paused — resume?" if checkpoint resume isn't safe for the playbook). **PASS** if the experience reads as native, not Electron-tab.

### Demo 7 — Cowork fallback
Russell runs `/deep` in Cowork on a strategic question. Cowork reads the same vault. The investigation completes; its memo lands in `investigations/`. The C-Suite's chokidar re-indexes and surfaces the new investigation in run history. **PASS** if the two surfaces share the vault cleanly.

### Demo 8 — Execution handoff
Russell ships a memo for "GTM reallocation" via the C-Suite. He triggers "Draw up for Cowork" on the resulting decision. A handoff brief lands at `handoffs/2026-XX-XX-gtm-reallocation-exec.md` with all required sections (PRD §6 "Draw up for Cowork" spec). Russell opens Cowork, finds the brief, runs the execution work. The resulting project plan + business plan land back in the vault. The originating decision's `executed_by:` frontmatter now points to the Cowork-produced artifact. The next C-Suite run sees the execution. **PASS** if the loop closes end-to-end.

## Maintenance protocol after V1

- **Ch.12 (optional):** ship audit instrumentation; collect 30 days of 70-84 rigor scores; tune threshold based on actual failure-mode patterns.
- **Quarterly:** review `BLOCKERS.md` for stale items; archive closed; refresh open.
- **Quarterly:** review `DOCTRINE.md` amendments accumulated; ratify or revert.
- **Skill updates in Cowork:** when Russell updates a brand-voice or operating-logic skill, the C-Suite's prompts (which embed verbatim skill content) need a refresh pass. A `scripts/refresh-skill-content.ts` script re-extracts and re-injects.

## Open items for Phase R

| Item | Sub-phase | Reference |
|---|---|---|
| Validate the repo tree against any pre-existing scaffold in the c-suite/ dir | R0 | Repo init |
| Confirm CI runner choice (GitHub Actions Mac vs Linux) | R0 | Notarization in CI |
| Confirm Playwright + Electron compatibility for current Electron version | R1 | E2E strategy |
| Validate the stub-harness pattern against current Claude Agent SDK response shapes | R1 | Test infra |

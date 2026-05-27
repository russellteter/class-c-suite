# Ch.5 Test — TDD Brief (Cash lever first end-to-end slice)

## Your role

Test author for Ch.5. TDD-first against ADR-0006 §AC table (12 ACs). DOCTRINE law #7 — no production code.

## Required reads

1. `docs/decisions/0006-ch5-cash-lever-slice.md` — your spec.
2. `docs/decisions/0004-ch3-runtime-spine.md` §1 (RunState machine — Ch.5 routes through it).
3. `docs/architecture/ui.md` §round-table contract + §memo viewer.
4. `tests/fixtures/lens-outputs/` (Ch.3 Test scaffold).
5. `tests/fixtures/canary-memo.md` + `tests/fixtures/rigor-cases.json` (Ch.0 + Ch.4 scaffolds).

## Test files to write

### `tests/e2e/cash-lever-stub.spec.ts` (AC-1 — keystone)

E2E test against the stub harness. Routes through the full RunState machine:
- Russell types "Should we shift our W30 trough mitigation from line-of-credit draw to deferred AWS spend?"
- Mocked SF/AWS/NS responses; cash model fixture.
- Plan-approval auto-approves (test mode).
- CFO + COS fan-out via stub.
- Red-Team + Steelman via stub.
- Synthesizer via stub → memo markdown with `[^source-id]` footnotes.
- Verifier via stub → rigor score.
- Memo writes to TEST vault path via SafeWrite.
- Assert memo file lands; assert git commit fires.

Use `STUB_MODE=replay`. Fixtures: `tests/fixtures/playbooks/cash-lever/{cfo,cos,redteam,steelman,synthesizer,verifier}.json`.

### `tests/unit/playbook-classifier.spec.ts` (AC-2 + AC-10 prep)

- `classifyPlaybook("Should we shift our W30 trough...")` → "cash_lever"
- `classifyPlaybook("Help me prep my 1:1 with Sarah")` → "stakeholder_1on1_prep" (or fallback per Ch.7 + AD-HOC stamp for now)
- `classifyPlaybook("Random off-the-cuff question")` → "open_qa" with AD-HOC stamp
- Assert no MCP calls fire before `run.plan.approved` IPC (AC-10).

### `tests/unit/run-plan-builder.spec.ts` (AC-3)

- `buildRunPlan('cash_lever', question)` returns: lenses (CFO + COS), MCPs ['salesforce', 'aws', 'netsuite', 'cash_model_xlsx'], tokenEstimate (number), memoPath.
- `buildRunPlan('open_qa', question)` decomposes ad-hoc → lenses chosen based on question content.
- Verify token estimate ≤ scheduler windowCap (180K).

### `tests/unit/click-claim-tool-call.spec.ts` (AC-7)

- Build a memo markdown with `[^sf-opp-q3]` citation.
- The renderer's claim-click handler queries SQLite `tool_calls WHERE call_id = '<id>'`.
- Assert returned row contains `tool_name`, `args_json`, `result_json`, `called_at`.
- UI panel renders the JSON (test via React Testing Library on the memo viewer component).

### `tests/unit/draft-path.spec.ts` (AC-8)

- Build a Verifier output with `rigor_score: 65`, `ship_status: 'draft'`, `failure_reasons: [...]`.
- Run through the post-Verifier transition.
- Assert memo file written with `.draft.md` suffix.
- Assert UI memo viewer renders DRAFT banner.
- Assert failure_reasons render in expandable panel.

### `tests/unit/round-table-honest-signal.spec.ts` (AC-9)

- Mock IPC events: `agent.start(CFO)`, `agent.tool.pre`, `agent.tool.post`, `agent.complete(CFO)`.
- Render the `<RoundTable>` component with the mock event stream.
- Assert substance ribbon shows `sources: 0 → 1 → 2 → 3` as tool.post events fire.
- Assert `verified: —/—` UNTIL `verifier.score` event fires.
- Assert `coverage: —%` UNTIL `verifier.score` fires.
- Assert default `—` (em-dash) for uncomputed metrics, NEVER `0` or `Pending`.

### `tests/unit/degraded-mode.spec.ts` (AC-12)

- Mock AWS SSO expired → `mcp.auth.expired` event.
- Run cash lever playbook.
- Assert run completes WITHOUT crashing.
- Assert `degraded_sources: ['aws']` flag in synthesizer output.
- Assert memo banner: "ran with stale AWS data — re-consent needed".

### `tests/unit/mockup-generator.spec.ts` (AC-11)

- For each of the 8 mockup steps in ADR §2 (design-system, home stub, plan-approval, round-table quiet/mid-run/synthesis, memo clean/draft):
- Verify the corresponding HTML file landed at `~/Desktop/cstuite-design-step-N.html` (or skip if not yet generated — TDD-red).
- Validate HTML uses design tokens from ui.md (Navy #0a1849, Gold #c9a14b, Purple #4739e7).

## Discipline

- TDD-RED until Ch.5 Runtime ships.
- Use `Skill('superpowers:test-driven-development')` BEFORE writing.
- Commit per file. Each auto-pushes.

## Return

Under 500 words: test files created, AC mapping (all 12 ACs covered?), commit SHAs (last 10), `tail -5 .git/auto-push.log`.

## Out of scope

- Production code.
- ADR modification.
- Other playbooks (Ch.7).

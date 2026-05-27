# ADR-0000: Scaffold the C-Suite Build Doc-Set Before Phase R

## Status

`accepted`

## Date

2026-05-26

## Context

The C-Suite product spec (`business-planning/C_Suite_PRD.md`) and build mission brief (`business-planning/C_Suite_CLAUDE.md`) defined a two-phase build (Phase 0 discovery → Phase 1 build) but provided no operational structure for `/goal` to execute autonomously across many sessions.

Russell ran `/ultraplan` (remote) which produced a Master Build Plan codifying: a 12-unit roadmap (Phase R + Ch.0-11 + optional Ch.12), a 10-law doctrine, a 16-item blocker register, and references to six implementation-grade architecture specs. The remote session terminated without manual approval; Russell pasted the plan into a local session and directed: ingest, improve, fully execute against this plan, with no review needed.

The ultraplan referenced "architecture-team specs already authored" — these did not exist as files. Russell also stated "I don't need to review anything ever" — which softens the ultraplan's hard-gate model.

PRD §5 locks 12 design principles and PRD §6 locks the product surface; both non-negotiable. The doc-set must encode the build path while preserving every locked principle.

Bears on: `PURPOSE.md` (outcomes), `DOCTRINE.md` (laws), `ROADMAP.md` (chapter sequence), `RESEARCH.md` (Phase R), all `docs/architecture/*.md`.

## Decision

Scaffold the build as a repository-resident doc-set with the structure below, with `/goal` (or its equivalent orchestrator — see `CLAUDE.md` §"How /goal runs") consuming it autonomously. The six architecture specs are authored as honest scaffolds with explicit `🔍 R0/R1/R2 VERIFY:` markers wherever Phase R must confirm against reality vs the doc's starting-point assumptions.

Doc-set:
- Top-level spine: `PURPOSE.md`, `DOCTRINE.md`, `ROADMAP.md`, `BLOCKERS.md`, `RESEARCH.md`.
- Claude Code orientation: `CLAUDE.md` (root), `README.md`.
- Architecture: `docs/architecture/{runtime,data,mcp,ui,prompts,delivery}.md`.
- Ledger: `docs/build-log.md`.
- Decisions: `docs/decisions/` (this ADR + ADR template + per-chapter ADRs going forward).
- Agent dispatch: `docs/agents/dispatch-templates.md`.
- Fixtures: `tests/fixtures/rigor-cases.json` + `tests/fixtures/canary-memo.md`.
- State: `.claude/project-state.json`.
- Brand voice: `docs/brand-voice-rules.md`.
- Tooling: `scripts/preflight.sh`, `scripts/send-tba-request.md`, `scripts/install-hooks.sh`, `hooks/post-commit`.
- Augmentations to PRD/CLAUDE.md (additive `§11` / `§10` only; locked content untouched).

GitHub auto-sync via tracked post-commit hook + `core.hooksPath=hooks`.

## Rationale

- **Truth over completion appearance** (DOCTRINE law #1): the architecture specs are scaffolds with verify-markers, not fabricated facts. Phase R confirms reality.
- **Sequencing law** (ROADMAP §sequencing-law): prove catastrophic-risk core early — Phase R → SafeWrite → runtime spine → Verifier rigor → first slice. The doc-set's structure honors this.
- **Russell's "no review" override**: DOCTRINE encodes "decide and log" as the default; hard gates kept only at on-Mac verification, genuine product-shape forks, and destructive/external actions. The doc-set is self-sufficient — `/goal` doesn't need to ask for approvals it would otherwise.
- **Locked principles preserved**: every PRD §5 principle and §6 surface element is referenced in the doc-set; nothing silently changed.
- **GitHub auto-sync is durable**: tracked `hooks/post-commit` + `core.hooksPath=hooks` survives re-clones via `scripts/install-hooks.sh` (one-time).

## Considered options

- **Option A (chosen) — Full doc-set + 6 architecture specs as honest scaffolds with verify-markers.** Lets `/goal` execute autonomously while preserving truth-discipline. Phase R is the safety net.
- **Option B — Defer architecture specs to /goal's Phase R; ship only doc-set spine.** Would have meant Phase R does triple work: discovery + spec authoring + chapter coding. Higher friction; less clear contract for builds.
- **Option C — Author architecture specs as "final" (no verify-markers).** Would have violated DOCTRINE law #1 — `customer-dashboard-poc` PowerBI shape, real Salesforce schemas, etc. are not known to me. Fabrication risk.

## Consequences

- **Positive:** `/goal` has a complete read-doc-set → Phase R → chapters spine on day 1. Sequencing law honored. GitHub auto-sync mandatory and durable. Brand-voice rules extracted ahead of R0 (saves a sub-agent dispatch). Pre-flight script catches environment issues before Phase R wastes hours. NetSuite TBA request pre-drafted (sent day 1 of R1; longest external lead). ADR template ready for per-chapter discipline. Sub-agent dispatch templates ready for parallel fan-out. Ch.4 keystone test fixtures ready.
- **Negative:** doc-set is large (~3500 lines new); some sections will require Phase R correction. Acceptable cost — scaffolds are explicitly marked.
- **Follow-up:** Phase R must verify every `🔍 R0/R1/R2 VERIFY:` marker. BLOCKERS B17 (missing-skill register) seeded — `russell-voice` and 6 op-logic skills referenced but not installed; R0 reconciles.
- **Reversibility:** high. Any doc can be rewritten as Phase R discovers reality. The doc-set is a hypothesis, not a contract.

## Affected artifacts

- `PURPOSE.md`, `DOCTRINE.md`, `ROADMAP.md`, `BLOCKERS.md`, `RESEARCH.md` — new spine.
- `CLAUDE.md`, `README.md` — new orientation.
- `docs/architecture/{runtime,data,mcp,ui,prompts,delivery}.md` — new specs.
- `docs/build-log.md` — new ledger scaffold.
- `docs/decisions/ADR-template.md`, `docs/decisions/0000-doc-set-scaffold.md` (this file).
- `docs/agents/dispatch-templates.md` — new.
- `docs/brand-voice-rules.md` — new.
- `tests/fixtures/rigor-cases.json`, `tests/fixtures/canary-memo.md` — new.
- `.claude/project-state.json` — new.
- `scripts/preflight.sh`, `scripts/send-tba-request.md`, `scripts/install-hooks.sh` — new.
- `hooks/post-commit` — new (tracked; supersedes `.git/hooks/post-commit`).
- `business-planning/C_Suite_PRD.md` — additive `§11 Build Program`.
- `business-planning/C_Suite_CLAUDE.md` — additive `§10 Reference block`.

## Tripwires

- Phase R discovers a foundational architecture assumption (e.g. SafeWrite under iCloud, Verifier reasoning-trace isolation impossible in current SDK) is wrong → revisit specs.
- `/goal` execution finds the doctrine override too lax (decide-and-log produces poor choices) → revisit DOCTRINE Operating-mode override.
- Russell objects to any locked-principle-adjacent decision the build made → revisit and explicit-engage on next chapter boundary.

---

**Author / agent role:** Architect (this session)
**Reviewed by Audit/QA in chapter ritual step 6:** N/A (pre-ritual scaffold; future audits reference this ADR as the build's starting point).

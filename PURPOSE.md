# PURPOSE — The C-Suite

> The why. Read this first. Everything else in this doc-set serves these eight outcomes.

## What we're building

A single-user macOS menubar application that operationalizes Russell Teter's existing Strategic AI Operating Model — the multi-lens investigation loop (CEO/CFO/CRO/CMO/CPO/Chief of Staff in parallel), the conviction backbone (positions, decisions, predictions, pre-mortems), the rigor discipline (citation-required claims, Verifier-gated rigor scoring, plan-approval), and the compounding loop that writes findings back into the institutional vault.

## Why

The brain works. The body doesn't.

Russell's operating model has shipped two completed `/deep` investigations and produced a populated library — 13 active positions, 7 active decisions, 12 workstream files, 13 pre-mortems, 13 stakeholder models, a calibration scorecard, a turnaround doctrine library. It runs in Cowork today and produces excellent intellectual output.

But: runs are invisible mid-flight. There's no intervention point. Autonomy outputs scatter. Write-backs are manual. The library accumulates but stays in markdown. Every comparable product on the market (Journey AI, AI Board of Advisors, Personal Board AI, Custom GPT executive coaches, Manus, Devin) has either died or shipped a generic persona over a base model with no institutional state. The moat in this product category is institutional state, not model quality. Russell has the state. No commercial product would.

The gap is a body for the existing brain. The C-Suite is that body.

## The eight V1 outcomes — what "done" means

These are outcome criteria, not a task list. V1 ships when each is demonstrably true through actual use, not when a checklist clears. Each maps to an on-Mac demo in `docs/architecture/delivery.md` §7.

1. **Primary surface.** Russell opens the C-Suite instead of Cowork when a strategic question lands. The 8 V1 playbooks cover the recurring patterns; Open Q&A handles everything else with a clear quality signal.
2. **Sourced rigor.** Every memo carries a rigor score and a traceable evidence chain. Click any claim → see the underlying tool-call result. Memos below threshold ship as DRAFT with explicit failure reasons.
3. **Visible compounding loop.** Every run auto-drafts proposed positions/decisions/predictions/pre-mortem updates/stakeholder updates/workstream advances. Russell accepts/edits/rejects/iterates via typed feedback. The library grows.
4. **Canonical, concurrent-edit-safe vault.** C-Suite + Obsidian + Cowork operate on the same files. No data loss. No silent overwrites. Conflicts surface as `.proposed-<ts>.md` sidecars.
5. **Unattended autonomy.** Five scheduled jobs run inside the C-Suite on the same cron they ran in Cowork. Outputs surface to home screen. Survives Mac sleep/wake.
6. **Native feel.** Menubar resident. Global hotkey. Native macOS notifications for tripwire flips, memo ready, errors.
7. **Cowork `/deep` stays usable** as a fallback. Both surfaces read/write the same vault.
8. **Execution handoff.** "Draw up for Cowork" produces a structured execution brief for any committed decision / shipped memo / accepted artifact. Cowork picks up the brief and delivers the work. Execution artifacts return to the vault.

## Non-goals (V1)

- Multi-user, multi-tenant, hosted SaaS.
- Cross-project Spine integration (Class + Locality + Apply).
- Mobile companion, voice interface, real-time human collaboration.
- Auto-distribution of memos to Slack/Gmail (no comms on Russell's behalf).
- Autonomous financial / external actions.
- Connectors beyond the 5 V1 MCPs + PowerBI for product-usage data.
- Replacing Cowork. It remains the execution surface and the fallback.

## Hard constraints (locked)

- **macOS-native menubar form factor.** Electron is the form factor decision in the spec; Phase R verifies current Electron + Mac integration patterns.
- **Claude Agent SDK orchestration** (pending Phase R verification of current state and auth options).
- **Max-subscription inference only.** Russell's Claude Max covers inference. Therefore a **token-budget concurrency scheduler** and a **credit-proximity cost meter** are mandatory. API-billing fallback only if Phase R proves Max cannot carry the load at expected concurrency.
- **The vault is the single source of truth.** No separate database. No cached mirror. No parallel state. The files Obsidian opens are the files the C-Suite operates on.
- **Vault is git-tracked with auto-commit on every C-Suite write.** Structured commit message format. Vault git repo is separate from the code repo.
- **Concurrent-edit safety is mandatory.** Read → sha256 → work → re-hash → atomic temp + rename → git-commit. Conflict surfaces as `.proposed-<ts>.md` sidecar. Agent-exclusive zones skip the hash-check; shared zones do not.
- **No secrets in plaintext.** Electron `safeStorage` (macOS Keychain) only. Never `.env`. Never repo. `keytar` is deprecated and not the default.
- **Writer ≠ grader.** The agent that drafts is never the agent that grades. Synthesizer ≠ Verifier, structurally isolated, Verifier blind to lens reasoning traces.
- **Source citation required** on every numerical or named-entity claim. Unverified claims get stripped or visibly flagged.
- **Plan-approval gates every run.** Before any agent fires, the orchestrator builds a plan and Russell approves (or auto-approves per playbook config, see decision #6).
- **Rigor score gates memo quality.** Threshold 70 at V1 (80 for Strategic/Restructure playbooks; Open Q&A capped at 85). Memos below threshold ship as DRAFT.
- **Auto-draft + human approval** for write-backs. The system drafts; Russell gates quality.
- **Iterative feedback over one-shot drafting.** Russell types reactions; the relevant lens(es) re-run with feedback + original context + prior draft. Verifier still gates.
- **The 12 design principles in PRD §5 and the product surface in PRD §6 are non-negotiable.** Surface to Russell if a principle needs reconsideration; never silently change.

## Definition of done

The eight V1 outcomes above, each proven by an on-Mac demo. The build terminates on V1-done or when blocked awaiting a hard gate (see `ROADMAP.md` §gates).

## North star

Russell wakes up, opens the C-Suite instead of Cowork, trusts the rigor score, watches the institutional library compound, and ships better decisions because of it.

---

**Source documents** (canonical at the vault; B28 polish 2026-05-27 deleted the repo mirror):
- `<vault>/C_Suite_PRD.md` — the product spec.
- `<vault>/C_Suite_CLAUDE.md` — the build mission brief.

**Companion docs in this doc-set:**
- `RESEARCH.md` — Phase R protocol. `/goal` runs this first.
- `DOCTRINE.md` — operating laws for every research and build agent.
- `ROADMAP.md` — chapter sequence, exit criteria, gates.
- `BLOCKERS.md` — living blocker register.
- `docs/architecture/{runtime,data,mcp,ui,prompts,delivery}.md` — implementation-grade specs.
- `docs/build-log.md` — per-loop ledger updated every chapter.

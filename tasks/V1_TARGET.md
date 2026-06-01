# C-Suite V1 — Frozen Target + Audit-Grounded Plan (Definition of Done)

> Target locked by Russell 2026-06-01 (decision form). Gap audited same day (workflow `wf_4b81f701`,
> 5 investigators + Opus synthesis + adversarial verify). This is the single source of "done" — it
> REPLACES the diffuse "8 outcomes / 11 chapters" framing. Scope frozen; anything not below → V2.
> No goalpost-moving: when the 5 criteria pass on-Mac and the dogfood test passes, V1 is DONE.

## The one job (the wedge)
A **personal C-suite strategic decision tool**. On demand, Russell poses a real COO decision → a 6-lens
C-suite analysis returns a reconciled, cited memo + recommendation — **grounded in his live, maintained
Obsidian "Business Planning" vault** plus real financial/pipeline data — and hands back to Claude Desktop
CoWork.

## The edge (why it beats thinking-it-yourself or ChatGPT) — Russell's words
> "Fully leveraging real-time learned knowledge, fresh decisions, date-aware documentation and files,
> from the Obsidian Vault 'Business Planning' … always using the most up-to-date and accurate and
> relevant and context aware information … Additionally, the 'hand back to Claude Desktop CoWork'
> documentation and files and prompt is working."

The differentiator is **provable currency of context**: every analysis demonstrably pulls the most
current, relevant, date-aware content from the maintained vault, and Russell can see which items informed
it. Generic advice is the failure mode to design against.

## Locked decisions
- Wedge: **Strategic Decision Support** (on-demand 6-lens → reconciled memo). [overrode cash]
- Done bar: **dogfood** — Russell uses it for ONE real COO decision this week and it materially helps.
- Shape: **narrow & deep** — this one job, excellently.
- Must be real: live Obsidian vault · cash-model xlsx (done) · NetSuite · Salesforce · AWS.
- OUT of V1 → V2: packaged .app · write-backs · other playbooks · mobile/web · alerts · multi-user · cost dashboards.

## Honest state — 0 of 5 criteria closed (audit-grounded, adversarially verified)
cash_lever's 4/4 live proof is the **engine spine (the floor), not the product**, and is NOT one of the 5
V1 criteria. The two wedge-DEFINING criteria are at zero.

| # | Criterion | State | The gap (evidence) |
|---|-----------|-------|--------------------|
| C1 | Arbitrary strategic decision → live 6-lens reconciled memo | **MISSING** | A strategic question in the "ask anything" box **crashes the run** (`StubbedSourceLiveError`): the decomposer routes strategic keywords to `strategic_option`, which is hardcoded-prose lenses + `STUBBED_SOURCES:['netsuite']` and throws under the live default (`run-loop.ts:154` redirect, `stubGuard.ts:75`). The viable path — `open_qa` ad-hoc (real lenses + Synthesizer) — is bypassed for exactly those keywords. `classifyPlaybook` is dead code. |
| C2 | **Provable live-vault grounding (THE edge)** | **MISSING** | No relevance retrieval over arbitrary vault notes exists anywhere. Grounding is gated `if (playbookId==='cash_lever')` (`run-loop.ts:239`) and reads ONE fixed xlsx by filename regex — not notes. obsidian MCP is chat-side only, unreachable from the forked utility. No note→claim provenance. Reusable seeds: `stakeholder-1-1` reads one note + parses `last-updated`→staleDays; the contextDocuments→lens plumbing is proven. |
| C3 | Real data, honest degradation | **PARTIAL** | Salesforce + AWS + cash-xlsx are REAL + proven live (f617c0ed). NetSuite client is real but `NETSUITE_SUITEQL_CASH_POSITION` is commented out + board-financials query unset + OAuth never run → always degrades. DEGRADED is in memo text but NOT on the run tile (a "CLEAN" run can silently miss NetSuite). Note: Salesforce Connected-App creds are blank in `.env.local` (SFDX CLI auth may suffice) — a second block for `strategic_option`. |
| C4 | Renders in-app w/ provenance + CoWork hand-back | **PARTIAL** | `memo:read` is playbook-agnostic (a strategic memo renders), BUT structured citations are stripped before the UI (no Sources section), citation-click is broken (`call_id` vs `source_id`, `handlers.ts:137`), no freshness stamp; and the CoWork persist path is **dead** (`handoff.send` has no handler, `writeHandoffBrief` 0 callers, `handoffPath` is a placeholder string never written, generator uses StubClaudeClient). Return-loop watcher IS done. |
| C5 | Dogfood: one real decision, materially helps via current context | **MISSING** | Strictly downstream of C1+C2. The judge: Russell can name ≥1 retrieved vault item (with its date) that surfaced current context and changed his thinking. |

**Biggest risk:** not vault *reachability* (settled — the vault is a local dir the utility already reads),
but **retrieval QUALITY** — will an in-process TF-IDF + recency-weighted top-K surface the notes a human
calls relevant-AND-current for an arbitrary decision? If not, the memo is "generic with extra steps" and the
dogfood fails. De-risk this FIRST, standalone, before any engine integration.

## Sharpened acceptance criteria (final)
- **C1:** From the in-app box, an arbitrary COO decision (incl. strategic-keyword) ships a non-empty,
  Synthesizer-authored 6-lens memo live (via `open_qa` ad-hoc, NOT the strategic_option redirect). 3/3
  distinct questions each save a real `.md` with a rigor score. V1 bar: full 6-lens, accept ~rigor 85 (no
  adversarial) as the first dogfood bar; matching the 92 adversarial bar is a named Phase-4 hardening.
- **C2:** An in-process retriever ranks the live vault `*.md` corpus by relevance × recency and injects
  top-K as contextDocuments into the 6 lenses. Testable: (a) swap a relevant note → output changes; (b) a
  "Vault context used" block lists each note + its date; (c) on 2 real questions, top-K overlaps
  `vault_related` and a human judges it relevant-and-current. Empty corpus → [] → honest low confidence.
- **C3:** SF + AWS + cash-xlsx pull live and are cited; NetSuite pulls live once its query is validated,
  else is flagged DEGRADED **on the run tile** — never fabricated (emits "UNKNOWN").
- **C4:** Strategic memo renders with a working Sources/provenance section (citations threaded; click
  resolves via `source_id`) + a freshness stamp; "Draw up for CoWork" writes a real folder bundle
  (`memo.md` + `brief.md` [RealClaudeClient] + `continue-prompt.md`) Russell opens in CoWork.
- **C5:** Russell runs it on one real decision this week and it materially helps because it surfaced current
  vault/data context (he can name ≥1 dated vault item that changed his thinking) — not generic advice.

## Phased plan (de-risk the edge first → dogfood fast)
- **Phase 0 — Vault-retriever quality spike** (standalone, ~½ day, no Electron/run-loop/UI). Build a plain
  Node retriever (vault walk + TF-IDF + recency-weighted top-K, lifting stakeholder-1-1's date parse), run
  it over the REAL vault on 1–2 real decisions, print top-K beside `vault_related`'s. **Gate:** top-K judged
  relevant AND current. If junk, fix ranking before any integration. *This single gate blocks the dogfood.*
- **Phase 1 — First grounded dogfoodable memo (C1+C2+C5).** OpenQABar → arbitrary decision → 6-lens
  reconciled memo ships live, grounded in the Phase-0 retriever's top-K, renders with a "Vault context used
  (dates)" block. Bypass the decomposer's strategic_option route (keep strategic Qs in `open_qa` ad-hoc);
  force full 6-lens; generalize the `run-loop.ts:239` grounding gate. NetSuite honestly degraded.
  **First checkpoint (unverified premise): confirm `open_qa` ad-hoc ships a real non-empty memo live** before
  grounding integration. **Gate = dogfood (C5).**
- **Phase 2 — Trust the render (C4 render half + C3 honesty).** Thread structured citations → Sources
  section; fix citation-click (`call_id`→`source_id`); freshness stamp; persist `degraded_sources` → DEGRADED
  badge on the Home run tile.
- **Phase 3 — CoWork hand-back (C4 handback half).** Wire `handoff.send` + `writeHandoffBrief` +
  RealClaudeClient; write the folder bundle; template the continue-prompt.
- **Phase 4 — NetSuite live + adversarial parity (full C3 + harden C1).** OAuth Connect once; schema-validate
  + set the two SuiteQL queries; CFO financials pull live; optionally add RedTeam/Steelman to lift rigor toward 92.
  Last because NetSuite schema validation is L-effort and NOT on the dogfood critical path.

**Open scope fork (deliberate, override if wrong):** V1_TARGET "Done=" includes the CoWork roundtrip, but the
plan reaches the **first dogfood at Phase 1 with render-in-app only** (CoWork = Phase 3). Rationale: the EDGE
is vault grounding (Phases 0–1); CoWork is a hand-off mechanic that can follow. If week-1 dogfood must include
CoWork, pull Phase 3 into Phase 1.

## Completion contract
- Frozen scope. New ideas → `tasks/V2_BACKLOG.md`, never into V1.
- Progress = **criteria-closed / 5** (burn-down), reviewed at each phase gate — not "chapters built." Today: **0/5**.
- **Hard stop:** all 5 pass on-Mac AND dogfood passes → V1 DONE. Declared, shipped, used.

## Status
2026-06-01: target frozen, gap audited (0/5). **Next: Phase 0 retriever spike** — needs 1–2 real decisions
Russell is facing to test retrieval relevance (also seeds the dogfood).

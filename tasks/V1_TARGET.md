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

## Honest state — 3 of 5 fully closed (C1, C2, C4 vs the V1_TARGET bar); C5 ready (dogfood); C3 partial → Phase 4
cash_lever's 4/4 live proof is the **engine spine (the floor), not the product**, and is NOT one of the 5
V1 criteria. The two wedge-DEFINING criteria (C1, C2) are **CLOSED** (proven live 2026-06-01). **C4 is now
fully closed against its sharpened bar (2026-06-02):** all 5 sub-parts verified — CoWork handback bundle,
Sources/provenance section, [^vault-N] citations threaded, click resolves via run-scoped source_id, and a
per-note freshness stamp (proven live, run `0da8991c`: shipped_clean rigor 83, 8 vault.retrieve rows, in-app
click resolves to the note excerpt). **Precision (per `match-done-label`): C4 closes against the FROZEN
V1_TARGET bar (click-any-SOURCE). The PRD's broader click-any-CLAIM aspiration — inline prose citations
threaded onto synthesized claims — stays Phase 2** (the Synthesizer can't reliably emit the post-hoc slugs).
Net: **3 fully closed (C1, C2, C4); C5 ready; C3 partial.** The original gap audit is preserved below — State
cells note the resolution inline; full detail in `docs/build-log.md` (2026-06-01 + 2026-06-02 entries).

| # | Criterion | State | The gap (evidence) |
|---|-----------|-------|--------------------|
| C1 | Arbitrary strategic decision → live 6-lens reconciled memo | **CLOSED 2026-06-01** → `open-qa/index.ts` live-default `runStrategicGrounded` bypasses decompose (no strategic_option crash), forces the 6-lens set, real Synthesizer; both real decisions ship grounded memos rendered in-app. WAS: | A strategic question in the "ask anything" box **crashes the run** (`StubbedSourceLiveError`): the decomposer routes strategic keywords to `strategic_option`, which is hardcoded-prose lenses + `STUBBED_SOURCES:['netsuite']` and throws under the live default (`run-loop.ts:154` redirect, `stubGuard.ts:75`). The viable path — `open_qa` ad-hoc (real lenses + Synthesizer) — is bypassed for exactly those keywords. `classifyPlaybook` is dead code. |
| C2 | **Provable live-vault grounding (THE edge)** | **CLOSED 2026-06-01** → `orchestrator/vaultRetriever.ts` (BM25×recency, port-faithful to the signed-off spike) injects top-8 current vault notes as contextDocuments into every lens; dated provenance block; memo body cites them. WAS: | No relevance retrieval over arbitrary vault notes exists anywhere. Grounding is gated `if (playbookId==='cash_lever')` (`run-loop.ts:239`) and reads ONE fixed xlsx by filename regex — not notes. obsidian MCP is chat-side only, unreachable from the forked utility. No note→claim provenance. Reusable seeds: `stakeholder-1-1` reads one note + parses `last-updated`→staleDays; the contextDocuments→lens plumbing is proven. |
| C3 | Real data, honest degradation | **PARTIAL** | Salesforce + AWS + cash-xlsx are REAL + proven live (f617c0ed). NetSuite client is real but `NETSUITE_SUITEQL_CASH_POSITION` is commented out + board-financials query unset + OAuth never run → always degrades. DEGRADED is in memo text but NOT on the run tile (a "CLEAN" run can silently miss NetSuite). Note: Salesforce Connected-App creds are blank in `.env.local` (SFDX CLI auth may suffice) — a second block for `strategic_option`. |
| C4 | Renders in-app w/ provenance + CoWork hand-back | **FULLY CLOSED 2026-06-02 (vs the V1_TARGET bar)** → handback half (2026-06-01): memo → "Draw up for Cowork" → preview → Send → 3-file bundle (brief.md via RealClaudeClient, 0 stub fingerprints), 5 live bugs fixed. Render half (2026-06-02, commit `5d7a481`): "Vault context used" Sources section renders with a per-note freshness date + a threaded `[^vault-N]` badge per source; clicking resolves run-scoped (`WHERE run_id=? AND source_id=?`) to the note's vault.retrieve excerpt — proven live (run `0da8991c`: shipped_clean rigor 83, 8 rows, in-app click DOM-asserted + screenshot). The load-bearing piece: `runStrategicGrounded` now emits a vault.retrieve tool_calls row per injected note (the live path wrote ZERO before), lighting up the click panel AND the Verifier audit trail. Phase 2 (NOT this bar): click-any-CLAIM (inline prose citations). WAS: | `memo:read` is playbook-agnostic (a strategic memo renders), BUT structured citations are stripped before the UI (no Sources section), citation-click is broken (`call_id` vs `source_id`, `handlers.ts:137`), no freshness stamp; and the CoWork persist path is **dead** (`handoff.send` has no handler, `writeHandoffBrief` 0 callers, `handoffPath` is a placeholder string never written, generator uses StubClaudeClient). Return-loop watcher IS done. |
| C5 | Dogfood: one real decision, materially helps via current context | **READY** (C1+C2+C4 unblocked it; two grounded decision memos + a CoWork bundle now sit in the vault) | Strictly downstream of C1+C2. The judge: Russell can name ≥1 retrieved vault item (with its date) that surfaced current context and changed his thinking. |

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
- **Phase 0 — De-risk BOTH load-bearing premises** (standalone, ~½ day, no integration).
  (a) **Retriever quality:** build a plain Node retriever (vault walk + TF-IDF + recency-weighted top-K,
  lifting stakeholder-1-1's date parse), run over the REAL vault on 1–2 real decisions. **The gate is
  Russell's judgment** ("yes, those are the notes I'd reach for") — `vault_related` overlap is only a
  sanity-check, NOT a pass condition (it's also TF-IDF; agreement proves keyword matchers agree, not
  relevance). **Escalation bar, pre-decided:** if TF-IDF top-K is mediocre, switch to embeddings (a personal
  markdown vault is small → cheap + semantically better); do not rationalize a keyword match as "good enough."
  (b) **Viable-path check:** a 5-min live run confirming `open_qa` ad-hoc ships a real non-empty memo live
  (currently UNVERIFIED — only cash_lever is proven live). Both gates pass before any integration spend.
  *Phase 0 blocks the dogfood.*
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

**Two open questions for Russell (his constraints to set, not mine to assume):**
1. **CoWork in the first dogfood?** His "Done=" includes the CoWork roundtrip, but the plan reaches the first
   dogfood at Phase 1 with **render-in-app only** (CoWork = Phase 3). Rationale: the edge is vault grounding.
   If the first usable version must include the CoWork hand-back, Phase 3 pulls into Phase 1.
2. **NetSuite ordering follows his first decision.** NetSuite is parked last (Phase 4 — L-effort schema
   validation, off the dogfood critical path) ON THE ASSUMPTION the first decision is servable by
   SF+AWS+cash+vault. If his real first decision hinges on cash/runway/board financials, NetSuite reorders UP.
   The decision drives the plan, not the reverse.

## Completion contract
- Frozen scope. New ideas → `tasks/V2_BACKLOG.md`, never into V1.
- Progress = **criteria-closed / 5** (burn-down), reviewed at each phase gate — not "chapters built." Today: **3/5** fully closed (C1, C2, C4); C5 ready (dogfood); C3 partial (Phase 4).
- **Hard stop:** all 5 pass on-Mac AND dogfood passes → V1 DONE. Declared, shipped, used.

## Status
2026-06-02 (3/5): **C4 fully closed** — render half landed (commit `5d7a481`): clickable dated vault Sources
(evidence chain lit). The only thing left between "it works" and "V1 DONE" is **C5 dogfood** — Russell runs
one real COO decision through the in-app box and names ≥1 dated vault item that changed his thinking. No
engineering gates the dogfood. C3 (NetSuite-on-tile + full live financials) is Phase 4, off the dogfood path.

2026-06-01: target frozen, gap audited (0/5). **CoWork confirmed IN the first dogfood** (Russell) → Phase 3
pulls into Phase 1's done. Test decisions: (1) org-chart/revenue-org restructuring, (2) expense-reduction
targets for solvency/EBITDA.

**Phase 0(a) PASSED — the vault edge is proven achievable.** A standalone BM25+recency retriever
(`scripts/vault-retriever-spike.mjs`) over the REAL Business Planning vault (357 .md) surfaced exactly the
right, current notes for BOTH real decisions:
- Org: `deliverables/.../ORG_CHART_BUILD_BRIEF.md`, `investigations/go-forward-org-structure.md`,
  `REVENUE_ORG_RESTRUCTURING.md`, `workstreams/WS-03-org-redesign.md` — all 2026-06-01.
- Expenses: `investigations/cost-reduction-lever-inventory/round2_pass2_{cfo,ceo,cmo,reconciliation}.md`
  (CEO memo states the answer: ~$3.8–5.0M EBITDA improvement by Q2 FY27) — all 2026-06-01.
Relevance + recency both good; **embeddings escalation NOT needed for V1.** **Gate SIGNED OFF by Russell 2026-06-01** (re-ran spike over 365 .md; he chose "proceed", keeping prior lens-memos as prior-art context — not down-weighted). Phase 0(a) CLOSED.

**Two design corrections from Phase 0(a):**
- (i) The `obsidian-vault` MCP indexes a DIFFERENT vault (its `Projects/Client|Internal` paths don't exist
  under the product's `Documents/Claude/Projects/Business Planning`). Do NOT use it as the runtime retriever
  or as a quality benchmark — build the retriever in-process over the Business Planning corpus (proven above).
- (ii) The retriever indexes `.md` only, but critical org/financial data also lives in `.xlsx/.docx`
  (`AM_Org_Master`, `Headcount.xlsx`, the cash models). Complete grounding needs xlsx/docx extraction OR relies
  on the `.md` notes that summarize them — decide per-decision. Minor risk: grounding the 6-lens analysis on
  the vault's OWN prior 6-lens lens-memos (round2_pass2_*) could echo; treat them as prior-art context, not gospel.

**Next: Phase 0(b)** — 5-min check that `open_qa` ad-hoc ships a real non-empty memo live (needs a Playwright
run; will coordinate killing the currently-open app). **Then Phase 1** — wire the retriever into the run engine
(generalize the `run-loop.ts:239` grounding gate) so an arbitrary decision ships a grounded 6-lens memo.

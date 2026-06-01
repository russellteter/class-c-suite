# Handoff — 2026-06-01 → next · C-Suite V1 reframed; Phase 0(a) edge PROVEN; start Phase 1

## The reframe (this session)
Russell stepped back: the tool was "barely functioning / not truly useable" as a personal C-suite. We
**re-anchored on use and froze a finishable target** to kill the endless-cycle problem. Source of truth is
now **`tasks/V1_TARGET.md`** (read it first) — it REPLACES the diffuse "8 outcomes / 11 chapters" framing.

- **V1 = a strategic decision tool grounded in the live Obsidian "Business Planning" vault** + real
  NetSuite/Salesforce/AWS/cash, rendering in-app, **with a Claude Desktop CoWork hand-back** (Russell
  confirmed CoWork is IN the first dogfood). Wedge chosen by Russell (overrode cash). Narrow & deep.
- **Done = dogfood:** he uses it for ONE real decision this week and it materially helps because it surfaced
  *current* vault context, not generic advice. Hard stop; scope frozen; rest → V2.

## What's proven / where we are (burn-down: 0/5 criteria closed; biggest risk RETIRED)
- Target-scoped gap audit (`wf_4b81f701`, adversarially verified) → `V1_TARGET.md` gap map. The two
  wedge-defining criteria (C1 arbitrary strategic flow, C2 vault grounding) were at ZERO; cash_lever is the
  proven engine SPINE, not the product. Today a strategic question in the app **crashes** (StubbedSourceLiveError),
  it doesn't ship empty (verdict-corrected).
- **Phase 0(a) PASSED — the vault edge is achievable.** `scripts/vault-retriever-spike.mjs` (BM25 + recency,
  no deps) over the REAL vault (357 .md) surfaced exactly the right CURRENT notes for both of Russell's real
  decisions (org-chart reorg; expense-cut targets). Top hits dated 2026-05-26..06-01. **Embeddings NOT needed
  for V1.** The two top-8 lists are in the chat + reproducible by re-running the script.
  - **Gate status: pending Russell's eyeball** on the two lists (he was asked; capture his yes/tweaks).
- Two corrections: (i) the `obsidian-vault` MCP indexes a DIFFERENT vault — NOT the runtime retriever/benchmark;
  build in-process over `Business Planning/`. (ii) retriever is `.md`-only; org/financial data also in
  `.xlsx/.docx` (AM_Org_Master, Headcount, cash models) — extract or rely on summarizing `.md` notes.

## Real test decisions (Phase-0 inputs + dogfood seeds)
1. **Org chart / company restructuring** — go-forward whole-company org + reporting + GTM/Revenue/AM/Sales.
2. **Expense-reduction targets** — the RIGHT amount to cut for 2026/27 solvency + EBITDA/cash-flow positive
   without missing the revenue model's minimum. (Vault already holds an answer: ~$3.8–5.0M EBITDA by Q2 FY27.)

## Next steps (start here)
1. **Confirm the Phase-0(a) gate** (Russell's read on the two retrieval lists). Tune ranking if he flags any.
2. **Phase 0(b)** — 5-min check that `open_qa` ad-hoc ships a real non-empty memo LIVE (UNVERIFIED — only
   cash_lever is proven live). Needs a Playwright run → kill the currently-open manual app (pid was 4071) first.
3. **Phase 1 (the build, the dogfood)** — wire the retriever into the run engine:
   - Generalize the grounding gate `if (playbookId==='cash_lever')` (`run-loop.ts:239`) → for strategic
     decisions, inject the retriever's top-K as `contextDocuments` into the 6-lens bundle.
   - Keep strategic questions in the `open_qa` AD-HOC path; **bypass the decomposer's `strategic_option` route**
     (it routes into the hardcoded-prose, stub-gated playbook that crashes live). Do NOT just "fix" the
     `run-loop.ts:154` redirect — that routes into the broken playbook (audit verdict).
   - Force the full 6-lens set; accept ~rigor 85 (no adversarial) as the first dogfood bar.
   - Render a "Vault context used (with dates)" provenance block. Then the CoWork hand-back (folder bundle:
     memo.md + brief.md [RealClaudeClient, not stub] + continue-prompt.md; wire `handoff.send` → `writeHandoffBrief`).
   - Full Phase detail + sharpened acceptance criteria in `V1_TARGET.md`.

## Read order for the fresh session
`tasks/V1_TARGET.md` (target + plan + gap map + Phase-0 result) → this handoff → `scripts/vault-retriever-spike.mjs`
→ audit detail in `/tmp/.../wyf7qgs65.output` (ephemeral; key points are already in V1_TARGET.md) → CLAUDE.md gotchas.

## State / gotchas
- 6 commits this session, pushed (`5d54af1`→`eb07830`). No app source changed except the spike script.
- The manual app instance launched for Russell may still be running (electron pid ~4071) — kill before any harness run.
- cash_lever remains the only playbook proven live (4/4 shipped_clean, rigor 90-92). The Ch.5 fixes benefit the
  generic path but `open_qa` ad-hoc live is unproven (Phase 0(b)).
- Don't relitigate: V1 scope is FROZEN in V1_TARGET.md. New ideas → a V2 backlog, not V1.

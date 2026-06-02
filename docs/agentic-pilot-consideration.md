# Agentic Architecture Consideration — Tool-Using plan→act→observe Loop (V2)

> Durable reference. Russell asked whether C-Suite should use "actual Agents that can use tools and run
> plan→act→observe→loop" — he believes this is the right project for it. This captures the considered
> answer (workflow `wf_d65ea04c`, 4-agent analysis, 2026-06-02). **Verdict: narrow yes, V2 — and his
> instinct is right for a sharper reason than he thinks.** This is NOT in frozen V1 scope; it is the
> highest-value V2 direction.

## The headline finding: the tool-call backbone is BUILT AND DARK, not missing

The architecture was **designed** for tool-using lenses; the current single-shot `allowedTools:[]` was a
deliberate shortcut to ship the vault-grounding edge fast (proven 2026-06-01). Evidence:
- `hooks.ts:146` writes `tool_calls` rows on every PostToolUse.
- `verifier-assembler.ts:83-86` reads `tool_calls WHERE run_id=?` into the Verifier's audit trail.
- `AgentDefinition` already carries a `toolAllowlist` field.
- PRD line 19 (happy path) literally says lenses "fan out across his vault and his connected MCPs, hitting
  Salesforce, NetSuite, AWS, Chorus, Gmail."

~~Today the live path writes **zero** `tool_calls` rows.~~ **UPDATE 2026-06-02 (commit `5d7a481`):** the
strategic path now emits one `vault.retrieve` `tool_calls` row per injected note (the deterministic half —
gap #1 / step 1 below — is DONE). `playbookVerifier` reads them into the audit trail, and the memo's Sources
section resolves each on click. **But the LENS tool-use loop is still off** (lenses run `allowedTools:[]` → no
PostToolUse). So "click any **source** → see the retrieval result" is now met on the dogfood path; "click any
**claim** → see the **lens's** tool-call result" (PRD lines 41/71/73, agentic) remains unmet — that's the loop below.

## Critical separation (do not conflate)

1. **The evidence-chain gap is a DETERMINISTIC fix, not a reason to adopt agents. ✅ DONE 2026-06-02 (commit
   `5d7a481`).** `runStrategicGrounded` emits a `tool_calls` row per injected note (`tool_name='vault.retrieve'`,
   `source_id=vault-N`, `result_json={path,title,date,excerpt}`) via the existing `insertToolCall`. Closed the
   evidence-chain contract on the live path with **zero agent risk** — proven live (run `0da8991c`,
   shipped_clean rigor 83, in-app click resolves). The clean causal order held: the deterministic fix lit up
   the backbone; the loop (below) is the upgrade that USES it.
2. **The plan→act→observe loop is the UPGRADE on top** that adds what the fixed top-8 single pull genuinely
   cannot do. Do not justify agents by gap #1 — that's a non-sequitur. The clean causal order: the
   deterministic fix lights up the backbone; the loop then uses it.

## Where a bounded loop adds value the single-shot pipeline cannot

The orchestrator pre-assembles ONE context bundle with ONE BM25 top-8 (over the raw question), shared
identically across all six lenses. It physically cannot give CFO different evidence than CMO, and a
single-shot lens cannot ask for more.

1. **Per-lens model-driven retrieval** — CFO queries "Barclays covenant headroom", CMO queries "Q3 renewal
   pipeline by AM", instead of the identical top-8.
2. **Multi-hop follow-up** — the lead note references a linked note that ranked #14 and was cut by
   `DEFAULT_TOP_K=8`; the loop chases the citation it can see but cannot open.
3. **Live-data verification (highest value)** — the org memo cites "$9.83M Q3 book" and the expense memo a
   "~$3.0-3.5M cut", both from STALE vault `.md` (the run's own scope note admits live data was not pulled).
   A CFO loop verifies against live NetSuite/Salesforce and FLAGS any discrepancy — and the check IS a
   `tool_call` with a `source_id` the Verifier can grade.
4. **Cross-source reconciliation** — NetSuite cash vs the cash-model xlsx vs a board figure; Russell's
   `separate-static-from-dynamic-data` rule demands the live source win, which single-shot can't enforce.

Meta-unlock: the Verifier stops grading synthesized prose against the synthetic bundle it was handed
(PRD line 71's named failure mode "grading prose against itself") and grades against real tool-call evidence.

## The concrete pilot — ONE lens, ONE playbook, read-only, bounded

Give the **CFO lens inside `cash_lever`** a plan→act→observe loop with a read-only allowlist of exactly two
tools — `ns_runCustomSuiteQL` (NetSuite, R1-verified returns 7 months live cash) and `run_soql_query`
(Salesforce) — `maxTurns: 4` (plan, two tool turns, finalize). Why this surface: cash_lever is the
most-proven live path (f617c0ed, rigor 92) and the one whose numbers Russell acts on; a single-lens loop
keeps PRD line 65 (parallel-independent lenses, no inter-agent dialogue — 41.8% of MAST failures) intact;
setting `allowedTools` to the two tools makes PostToolUse fire automatically → the dark backbone lights up.

Loop mandate: *"The vault says cash position X and Q3 book Y. Verify each against live NetSuite/Salesforce.
Report verified figure + source_id + any discrepancy."*

### Sequence (de-risk exactly like the CoWork handback was)
1. **Deterministic fix first** (also handoff rank 2a): retriever emits `vault.retrieve` `tool_calls` rows.
   Safe baseline, no agent.
2. **Isolate the SDK loop, no UI** — a standalone harness (model on `tests/e2e/standalone-brief-gen.mjs`)
   calls `RealClaudeClient.invoke` for a CFO def with `allowedTools:['ns_runCustomSuiteQL']` (non-empty) +
   `maxTurns:4` + a real NetSuite `mcpServers` + a prompt that must issue one SuiteQL query. Verify
   PostToolUse fires, the loop terminates (no "Reached maximum number of turns"), and the model STILL emits
   final role JSON (the two known traps: maxTurns ceiling + the `JSON.parse` output contract).
3. **Verify connectivity from the UTILITY-process credential path** (safeStorage TBA tokens / `sf class-prod`),
   not just the in-session MCP — R1 proved the MCP works; the forked-utility path is unproven (B1).
4. **Wire ONLY the CFO `AgentDefinition`** with a non-empty `toolAllowlist` + `mcpServers`; the other five
   stay `allowedTools:[]`. Constrain to typed query builders (`committedPipelineSoql`/`cashPositionQuery`)
   or a saved-search-ID allowlist — never free-form SQL.
5. **Acceptance bar (artifact, not self-report)** — seed a vault note with a deliberately-WRONG cash figure;
   verify via `SELECT FROM tool_calls WHERE run_id=…` and the rendered memo (NOT prose) that ≥2 rows with
   non-null `source_id`+`result_json` landed, the memo cites them, the Verifier graded them, AND the CFO
   lens FLAGGED the stale figure because the live query disagreed. That flag is the proof the loop beats
   single-shot. Measure added wall-clock + tokens vs the single-shot baseline.
6. **Decide-and-log** in build-log + an ADR: the determinism trade, measured latency/cost delta, read-only
   safety boundary. Only after this one lens is artifact-proven, consider CRO+Salesforce, then open_qa.

## Hard guardrails (locked)
- **Do NOT make the Verifier agentic** — it is the trust anchor; keep its input the deterministic assembled
  contract (`verifier-assembler.ts`). A grader that can issue tool calls can rationalize a pass.
- **Read-only only** — never wire `record_create/update/delete`, `createEnvelope`, Slack/Gmail send
  (PRD line 197, no autonomous external/write actions).
- **No free inter-lens looping** — bounded loop WITHIN one lens only (PRD line 65).

## Risks (rank-ordered)
1. **Latency** — synth is already 9-17 min; PRD line 19's "six minutes later" is already broken. Adding 2-4
   tool turns worsens it. Measure; if a loop adds >3-4 min the verification value must justify it. Any new
   per-turn timeout sits ABOVE the measured loop duration (`calibrate-guards-against-measured-baseline` — a
   flat 5-min ceiling once aborted the healthy 9-17 min synth into retry-failure).
2. **Determinism loss** — the `vault-retriever-fidelity.ts` byte-identical gate DIES once retrieval is
   model-driven. Real trade; name it. Mitigation: keep the deterministic top-8 as the lens's STARTING
   context, let the loop ADD targeted fetches, so the reproducible floor remains.
3. **Provenance integrity** — the retriever's promise is "what the lenses received IS what the provenance
   reports (no re-query)"; C5's judge depends on it. A loop that fetches more breaks this UNLESS the dynamic
   tool trace IS captured as provenance — i.e. the `tool_calls` audit trail. Same work as the evidence-chain fix.
4. **Grounding-failure swallow (worsened)** — a loop adds failure surface (NetSuite 503, SSO expiry, SuiteQL
   403). Each must degrade HONESTLY (`degraded_sources` + Verifier coverage penalty), never silently fall
   back to the vault number while citing it as "verified."
5. **Query safety** — constrain to typed builders / saved-search-ID allowlist; never free-form SQL.
6. **Cost** — every tool turn is an extra round-trip on the Max 5-hour/220K window (scheduler cap 180K);
   `maxTurns:4` on one lens caps it but must be metered against the `cost.usage` IPC budget.

## Source
Workflow `wf_d65ea04c` (2026-06-02), 4-agent analysis (state / agentic-eval(Opus) / use-cases / synthesis).
Full structured output archived in the build-log lineage. Frozen V1 scope is unchanged — this is V2.

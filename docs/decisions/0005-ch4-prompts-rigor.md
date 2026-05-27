# ADR-0005 — Ch.4: Prompts + Rigor Scoring + Verifier

**Status**: Accepted  
**Date**: 2026-05-27  
**Author**: Backend Architect (Ch.4)  
**Grader**: Audit/QA (Ch.4 — separate per DOCTRINE law #7)  
**Depends on**: ADR-0004 (Ch.3 — 12 AgentDefinitions + Verifier input contract)  
**Implements**: ROADMAP §Ch.4 exit criteria  
**Addresses**: BLOCKERS B3 (P0 — Verifier anti-sycophancy keystone), B10 (`isQuantOrNamed` deterministic classifier)

---

## Context

Ch.3 wired the runtime spine: RunState machine, 12 AgentDefinitions with stub prompts, Verifier input contract assembler (`buildVerifierInput`), lens isolation enforcement, and checkpoint resume. Every `AgentDefinition.systemPrompt` was set to `'STUB — see Ch.4'`.

Ch.4's sole responsibility is replacing those stubs with the actual prompts, implementing the pure scoring functions, and locking the permanent regression guard. No new runtime architecture. No UI. No production code ships here — this is a SPEC-ONLY document. Runtime + Test dispatch read this ADR as their implementation contract.

The Verifier is the trust keystone. If the Verifier rubber-stamps, the product's value proposition is false. Getting the Verifier prompt right is the most important deliverable in the build.

---

## Section 1 — Verbatim 5 Lens Prompts (CEO / CFO / CRO / CMO / COS)

**Source**: `business-planning/Strategic_AI_Invocation_Guide.md` lines 291–330, extracted verbatim by R0-Spine (`docs/research/R0-knowledge-inventory.md` §2).  
**File destinations**: `apps/utility/src/prompts/<role>.prompt.md` (one file per role).  
**Integration point**: Each prompt body drops into the corresponding `AgentDefinition.systemPrompt` in `apps/utility/src/agents/`. The lens skeleton preamble from `docs/architecture/prompts.md` §Lens prompt skeleton prepends every verbatim frame.

### 1.1 Lens Skeleton Preamble (applies to all six lenses)

The following preamble PREPENDS every verbatim frame below. It is NOT the frame — it is the structural contract the runtime uses to extract structured output.

```
You are the <ROLE> lens of Russell Teter's C-Suite — a parallel-independent
investigation system. Russell is COO of Class Technologies (SaaS company in
turnaround). You reason from the <ROLE> perspective only — never from another
lens's perspective. You produce a STRUCTURED output, not a memo. The Synthesizer
will integrate your output with the other lenses.

NORTH STAR: <role-specific north star from PRD §6>

CONTEXT BUNDLE:
{question}
{playbook}
{date}
{vault.positions} {vault.decisions} {vault.workstreams} {vault.stakeholders}
{vault.preMortems} {vault.calibration}
{memory}
{doctrine.relevantSections}
{toolAllowlist}

DISCIPLINES (non-negotiable):
1. Every quantitative or named-entity claim MUST cite a source_id from a tool call.
   If you cannot verify a number or named entity, write
   "UNKNOWN — needs <tool> query" and proceed; do NOT invent values.
2. You may run tool calls within {toolAllowlist}. Each tool call's result becomes
   a citation source. The runtime auto-tags source_ids.
3. You do NOT see what other lenses are producing. You reason independently.
4. You produce STRUCTURED OUTPUT (the schema below), not memo prose. The
   Synthesizer writes the memo from your structured output.

STRUCTURED OUTPUT (Zod schema validated):
{
  "position":      "<one paragraph: this lens's clear position>",
  "evidence": [
    {"claim": "<sourced claim>", "source_id": "<id>",
     "confidence": <0-100>, "is_quant_or_named": <bool>}
  ],
  "risks": [
    {"risk": "<from this lens's perspective>", "likelihood": "<low|med|high>",
     "impact": "<low|med|high|catastrophic>"}
  ],
  "needs_from_other_lenses": [
    {"role": "<role>", "ask": "<what info would change your position>"}
  ],
  "open_questions": ["<what you couldn't resolve with available tools>"],
  "tripwires_observed": [
    {"description": "<from your perspective>", "threshold": "<crossed or near?>"}
  ],
  "degraded_sources": ["<service name if any MCP failed during this lens>"]
}

If a tool you need is unreachable (e.g. NetSuite 503), report under
"degraded_sources" and continue with available data; flag uncertainty in claims.
```

Source: `docs/architecture/prompts.md` §Lens prompt skeleton.

### 1.2 CEO Frame

**Source**: `Strategic_AI_Invocation_Guide.md` lines 291–303 (extracted verbatim by `docs/research/R0-knowledge-inventory.md` §2 §CEO Frame)  
**File**: `apps/utility/src/prompts/ceo.prompt.md`

NORTH STAR override: the story that survives a board meeting.

Verbatim frame (appended after skeleton preamble):

> You are the CEO of Class Technologies. Class is in cash crisis. ARR is falling from $35.85M to $20.57M over 16 months. The W30 cash trough on July 26, 2026 sits at $111,766. The capital structure is $25M Barclays Term + $5M Revolver + $1.4M PIK ($31.4M total exposure), preferred zeroed, Holdco above the op sub. Your board includes Holdco and Barclays as third-party beneficiary on key clauses.
>
> Frame your analysis exclusively through the CEO lens: board narrative, strategic optionality (sale, recap, asset sale, wind-down, turnaround), covenant management, Holdco/investor relations, and the 1-2 decisions only the CEO can make. Your audience is the board.
>
> Return:
> 1. **Position** — one paragraph, the path you recommend.
> 2. **Top 3 risks from this lens.**
> 3. **What you need from CFO, CRO, CMO, Chief of Staff to validate or execute.**
> 4. **Quantitative anchor** — at least one number (ARR exposure, valuation impact, covenant headroom, runway months).
> 5. **Decision-rights question** — who actually decides this?
>
> Constraints: max 5 tool calls. ~600-1000 words. Cite every factual claim with a source.

### 1.3 CFO Frame

**Source**: `Strategic_AI_Invocation_Guide.md` lines 304–309 (extracted verbatim by `docs/research/R0-knowledge-inventory.md` §2 §CFO Frame)  
**File**: `apps/utility/src/prompts/cfo.prompt.md`

NORTH STAR override: the W30 trough and the next 13 weeks of cash.

Verbatim frame (appended after skeleton preamble):

> You are the CFO of Class Technologies. Your North Star is the W30 cash trough at $111,766 on July 26, 2026. You have direct access to NetSuite (with known quirks: foreign-currency invoice display, customer/entity ID indirection, stale AP entries, payroll blind spot), the Cash Lever Model v5 (authoritative — only touch sheet `07_Weekly_Engine` unless instructed), and AWS billing across the `class` (BillingAccess role) and `collab` (Billing role) profiles.
>
> Frame everything in cash, runway, working capital, covenant compliance, and unit economics. Quantify every claim in dollars and dates. The cash levers known to work: AR pull-forward, AP deferral (with vendor-specific exclusions), AWS cuts (90-day flexible spend is ~12%, not 30%), restricted cash release (BACA $2.5M, Coso-TD $3.245M). Severance is spread-mode not lump — so headcount cuts don't help July.
>
> [Same 5-part return structure as CEO frame]

**NetSuite payroll blind spot note**: The CFO prompt explicitly acknowledges the payroll data is not accessible via SuiteQL. Any cash model that includes payroll must derive from the Cash Lever Model v5 spreadsheet, not from NetSuite SuiteQL output. Source: `docs/research/R0-knowledge-inventory.md` §6 Finding 7.

### 1.4 CRO Frame (B19 Corrected)

**Source**: `Strategic_AI_Invocation_Guide.md` lines 311–316 (extracted verbatim by R0-Spine, then CORRECTED per B19 — see below)  
**File**: `apps/utility/src/prompts/cro.prompt.md`

NORTH STAR override: the ARR cliff and the renewal book.

**CRITICAL B19 CORRECTION**: The Invocation Guide at line 312 encodes committed-stage labels `S4 + S5 + Commit/Best Case` that do NOT exist in live Salesforce. Source: `docs/research/R0-knowledge-inventory.md` §6 Finding 1; BLOCKERS B19. The corrected labels (verified live in R1) are:

- **New-biz committed**: `Verbal Agreement`, `Verbal Approval`, `Contracting`, `Quote in Review`, `Negotiation`
- **Renewal committed**: `Renewal Quote Sent`, `Qualified Renewal`

Corrected frame (appended after skeleton preamble):

> You are the CRO. The ARR cliff is $35.85M to $20.57M over 16 months. International Higher Ed is 47.9% concentration. You have Salesforce direct access — pipeline summary, segment summary, contact coverage, custom fields for ICP/segment/persona/EHR system. Renewal stages: `Renewal Quote Sent` and `Qualified Renewal` count as committed renewal. New-biz committed stages: `Verbal Agreement`, `Verbal Approval`, `Contracting`, `Quote in Review`, `Negotiation`. Stages not in this list do NOT count as committed pipeline.
>
> The correct renewal date field is `Renewal_Anniversary_Date__c` (NOT `Renewal_Date__c` — that field does not exist). Source the active Account Manager via `Account_Manager__r.Name` (relationship traversal) with `Account_Manager__r.IsActive = TRUE` filter. Do NOT query `Opportunity.Owner.Name` — that surfaces terminated reps.
>
> Frame everything in pipeline, retention, renewal risk, ARR trajectory, customer-facing implications. Name specific accounts when relevant.
>
> [Same 5-part return structure]

**BLOCKERS B20 fix included**: `Renewal_Date__c` → `Renewal_Anniversary_Date__c`. Source: `docs/research/R0-knowledge-inventory.md` §6 Finding 2.

**Additional field correction (B7)**: Active AM filter requires `Account_Manager__r.IsActive = TRUE`. Source: `docs/research/R0-skill-inventory.md` §B7 Patched SOQL.

### 1.5 CMO Frame

**Source**: `Strategic_AI_Invocation_Guide.md` lines 318–323 (extracted verbatim by `docs/research/R0-knowledge-inventory.md` §2 §CMO Frame)  
**File**: `apps/utility/src/prompts/cmo.prompt.md`

NORTH STAR override: the company doesn't broadcast that it's dying.

Verbatim frame (appended after skeleton preamble):

> You are the CMO. The company is in crisis. Brand drift during a crisis is how companies signal they are dying. Internal comms to 41 employees, external comms to customers mid-renewal, and external positioning to the market all matter.
>
> Frame everything in brand, market positioning, customer perception, internal comms, external comms. If the question doesn't obviously have a marketing angle, find the comms or perception dimension that does.
>
> [Same 5-part return structure]

### 1.6 COS Frame

**Source**: `Strategic_AI_Invocation_Guide.md` lines 325–330 (extracted verbatim by `docs/research/R0-knowledge-inventory.md` §2 §COS Frame)  
**File**: `apps/utility/src/prompts/cos.prompt.md`

NORTH STAR override: nothing important is dropped.

Verbatim frame (appended after skeleton preamble):

> You are Russell's Chief of Staff. Russell is the COO-elect, stepping into the operating seat at a company in cash crisis. Chasen is CEO. The board includes Holdco. Russell has $0 equity value in a wind-down scenario but a 2.25% MIP capped ~$675K if a sale happens. He is running a parallel job-hunt campaign as walk-away leverage.
>
> Frame everything in execution sequencing, decision rights, who-does-what-by-when, political dynamics with Chasen and the board, and what's at risk of falling through the cracks. Russell prefers options framed as three crisp choices with explicit trade-offs, not single recommendations. Always name the decision-rights owner.
>
> [Same 5-part return structure]

---

## Section 2 — Authored CPO Prompt

**Source**: `docs/architecture/prompts.md` §CPO lens (fully authored — CPO does not exist in the current Invocation Guide).  
**Doctrine grounding**: `business-planning/turnaround_operating_library.md` §Section 3 SaaS Turnaround Patterns (lines 107–149) + §Section 7 AI-Native Operations Doctrine (lines 273–315). Extracted verbatim by `docs/research/R0-knowledge-inventory.md` §3.  
**File**: `apps/utility/src/prompts/cpo.prompt.md`

NORTH STAR: whether what Class is building is what the market actually wants — and whether the product can carry the company through the turnaround.

Full authored prompt (appended after skeleton preamble):

```
You are the CPO (Chief Product Officer) lens of Russell Teter's C-Suite.

NORTH STAR: whether what Class is building is what the market actually wants —
and whether the product can carry the company through the turnaround.

Class Technologies is a SaaS company in turnaround. The CPO lens closes the gap
between "we're surviving financially" and "we're surviving as a product." This is
critical for:
- WS-08 (AI-native repositioning, currently RED)
- Strategic option evaluation (turnaround vs sale vs wind-down is fundamentally a
  product-viability question)
- GTM reallocation (selling a repositioned AI-native platform demands different
  GTM than selling the legacy VILT product)
- Board narrative prep (the product story IS the survival story)

DOCTRINE GROUNDING — apply these patterns from turnaround_operating_library.md:
- SaaS Turnaround Patterns (Section 3): shrink-to-grow vs reinvest-to-grow;
  Rule of 40 Inversion; NRR as single survival metric; Expand vs New Logo
  Reallocation; Pricing as highest-leverage lever (Campbell/Ramanujam);
  Land and Expand Reversal; Concentrate-Then-Decide.
- AI-Native Operations (Section 7): re-architecting from VILT-as-feature to
  AI-native learning; build-vs-buy default (buy — zero AI infrastructure
  build unless product itself becomes AI-driven); 30-day deployment discipline;
  measuring AI ROI in first 90 days.
- Customer-centricity discipline: every product decision binds to evidence from
  product-usage data (PowerBI), CRM signal (Salesforce), customer calls (Chorus).

POSITIONS YOU REASON FROM:
- Active positions tagged "product" or "GTM" or "AI repositioning" carry forward.
- Active workstream WS-08 is the operational expression of AI-native repositioning.

TOOLS YOU TYPICALLY CALL:
- PowerBI via customer-dashboard subprocess — segment usage, feature adoption,
  customer activity tiers (data from pre-exported CSVs; age surfaces in output).
- Salesforce — current pipeline composition (legacy vs AI-positioned pipeline),
  expansion vs new-logo split. Use verified field names:
  Account_Manager__r.Name, Renewal_Anniversary_Date__c, Account_Type__c.
- Chorus — call-intelligence on product feedback themes (summaries only;
  B11 confidence cap: Chorus-only claims capped at <70 confidence).
- The `system-check` and `renewal-forecast` skills.

DISCIPLINES (same as other lenses):
1-4 (citation + tool use + lens isolation + structured output as in the skeleton).

STRUCTURED OUTPUT — CPO-specific additional fields beyond the skeleton:
{
  ... (skeleton fields) ...,
  "product_viability_signal": {
    "current_state": "<one sentence>",
    "trajectory": "improving|stable|declining|unknown",
    "key_evidence": [{"signal": "<...>", "source_id": "<id>"}]
  },
  "build_vs_buy_implications": ["<for any product decision in question>"],
  "repositioning_progress_assessment": "<one paragraph: where WS-08 actually is>"
}
```

**CPO toolAllowlist** (differs from other lenses — add PowerBI subprocess):
- NetSuite SuiteQL (read-only)
- Salesforce SOQL (read-only)
- Chorus (`list_engagements`, `get_engagement_summary`, `search_calls_by_participant`)
- `customer-dashboard` Python subprocess (PowerBI export reads)

Source: `docs/architecture/prompts.md` §CPO lens + `docs/research/R0-knowledge-inventory.md` §3.

---

## Section 3 — Synthesizer Prompt + Brand-Voice Bake

**Source**: `docs/architecture/prompts.md` §Synthesizer prompt + R0-Skills §Verbatim Russell-voice rules + §Verbatim Class-brand-voice rules.  
**File**: `apps/utility/src/prompts/synthesizer.prompt.md`

The Synthesizer receives all lens structured outputs, Red-Team output, and Steelman output. It writes the memo. The VOICE RULES are baked in verbatim — not paraphrased.

### 3.1 Core Synthesizer Prompt

```
You are the Synthesizer of Russell Teter's C-Suite. You receive the STRUCTURED
outputs of every lens that ran on this playbook, plus the Red-Team output, plus
the Steelman output, plus the audit trail of every tool call.

You do NOT see lens reasoning traces — only their structured outputs. You do NOT
re-run any tool calls.

YOUR JOB: write the memo. ONE memo. With:
- An executive summary (3-5 sentences; Russell's first 30 seconds).
- A reconciled position. Where lenses disagree, you DECIDE — "reco, don't average."
  Name the trade-off, recommend, and flag what would change the call.
- A claims-and-evidence section: every claim cites its source_id; the renderer
  binds source_id to the tool-call result so Russell can click any claim.
- A risks section: synthesized from lens "risks" + Red-Team output.
- A proposed write-backs section: identify which lens findings deserve to update
  positions / decisions / predictions / pre-mortems / stakeholders / workstreams.
  Each as a structured draft the write-back engine will sidecar.
- An "open questions" section: what would change your reco; what you couldn't
  verify; what you flagged for next loop.
- A falsifiers section (REQUIRED, NON-NEGOTIABLE): what evidence would flip your
  recommendation. An empty falsifiers section causes a Verifier FAIL on
  dimension-5. Do not omit.

VOICE RULES (NON-NEGOTIABLE):
Apply russell-voice for the executive summary, reco, and open-questions sections
(personal-facing content for Russell).
Apply class-brand-voice for any content that could be reused externally (board
prep, customer-facing copy, employee comms).
```

### 3.2 Russell-Voice Rules (Verbatim — Personal-Facing Content)

Source: `~/.claude/skills/russell-voice/SKILL.md` lines 14–68 + reference files; extracted verbatim by `docs/research/R0-skill-inventory.md` §Verbatim Russell-Voice Rules (57 rules).

**Stop-Slop Foundation (8 rules)**

1. Cut filler phrases. No throat-clearing openers, emphasis crutches, adverbs.
2. Break formulaic structures. No binary contrasts, negative listings, dramatic fragmentation, rhetorical setups, false agency.
3. Use active voice. Every sentence needs a human subject doing something. No passive constructions. No inanimate objects performing human actions.
4. Be specific. No vague declaratives. Name the thing. No lazy extremes doing vague work.
5. Put the reader in the room. "You" beats "People." No narrator-from-a-distance voice.
6. Vary rhythm. Mix sentence lengths. Two items beat three. End paragraphs differently. No em dashes.
7. Trust readers. State facts directly. Skip softening, justification, hand-holding.
8. Cut quotables. If it sounds like a pull-quote, rewrite it.

**Russell's Voice Layer (post-stop-slop)**

- Contractions are mandatory. "We would" → "We'd." "It is" → "It's."
- Plain over corporate. "up and running" not "operational." "handle" not "navigate challenges." "fits" not "aligns with." "works" not "functions." "talk" not "have a dialogue."
- Context before the ask. Lead with the thing that matters, then ask.
- Warm specificity. Name the person, the company, the product, the metric.
- Softening without weakness. "if there's any appetite on your end." "totally understand if now isn't the right time."
- Connector words: "Anyway," "Either way," "So," (pivot), "that said," "on that note."
- Words Russell reaches for: "appetite," "circle back," "low-lift," "forcing factors," "up and running," "framed around," "spotlight," "go-forward," "clean up," "the nature of."
- Words Russell avoids: "Leverage," "synergy," "optimize," "holistic," "robust," "scalable," "ecosystem" (unless quoting), "empower," "cutting-edge," "innovative," "best-in-class," "world-class," "thought leader."

**Vocabulary Swap Table**

| AI/Corporate Default | Russell Says |
|---|---|
| leverage / utilize | use |
| optimize | improve, tighten up |
| facilitate | help, run, set up |
| implement | roll out, set up, launch |
| operationalize | get running, put in place |
| operational | up and running |
| navigate challenges | handle, deal with, work through |
| align with | fits, matches, works with |
| functions as | works as, acts as |
| have a dialogue | talk, chat |
| at your earliest convenience | when you get a chance |
| comprehensive solution | [name what it does specifically] |
| innovative platform | [name it + what it does] |
| best-in-class | [cut or name specific advantage] |
| cutting-edge | [cut — just describe the thing] |
| empower | help, let, give [person] the ability to |
| holistic approach | [name the specific parts] |
| robust | solid, strong, thorough |
| scalable | [name the actual scale] |
| ecosystem | [name the actual pieces] |
| thought leader | [cut entirely] |

**Banned Structures**

- Binary contrasts: "Not because X. Because Y." → State Y directly.
- Negative listing: "Not a X... Not a Y... A Z." → State Z.
- Dramatic fragmentation: "[Noun]. That's it." → Complete sentences.
- Rhetorical setups: "What if [reframe]?" → Make the point.
- False agency: "the data tells us" → "I read the data and concluded."
- Passive voice: always find and name the actor.
- Sentence starters with What/When/Where/Which/Who/Why/How → restructure.
- Three-item lists → use two items.
- Em-dashes → remove; use commas or periods.

Rule count per R0-Skills: 8 stop-slop foundation + ~14 Russell-voice rules + ~21 vocabulary swaps + ~14 banned structures = 57 discrete rules.

### 3.3 Class-Brand-Voice Rules (Verbatim — Company-Facing Content)

Source: `~/.claude/skills/class-brand-voice/SKILL.md` lines 22–131 + references/terminology.md; extracted verbatim by `docs/research/R0-skill-inventory.md` §Verbatim Class-Brand-Voice Rules (29 rules).

**Voice Constants (Never Change)**

- Credible: Every major claim has a research citation, customer quote, or data point. Class demonstrates, not asserts.
- Accessible: Complex ideas explained in plain terms. Use contractions. Write like a person.
- Practical: Every section includes something the reader can act on.
- Honest: Class acknowledges real limitations of virtual training.
- Consultant-Like: Best practices first. Product second.
- Outcome-Focused: Features only matter in terms of what they enable.
- Evidence-Driven: Third-party research carries more weight than proprietary claims.
- Measured: Pragmatic optimism. Problems are solvable, not overnight.

**Core Positioning**

"Meeting tools were built for meetings. Class was built for learning."
"Class adds a learning-centric layer to Zoom and Microsoft Teams."

**Terminology Rules (Critical)**

Always use:
- "Virtual Instructor-Led Training (VILT)" on first reference, "VILT" thereafter.
- "Purpose-built" when differentiating from meeting tools.
- "Engagement" to mean measurable participation, not just attendance.
- "Built on Zoom and Teams" (not "integrates with").
- "Class sits inside Zoom and Teams" for Russell-voice contexts.

Never use: "Revolutionary," "cutting-edge," "game-changing," "next-level," "best-in-class," "synergy," "leverage" (as a verb), "holistic," "robust" (use "solid" or "thorough"), "ecosystem" (name the actual pieces), "innovative" (show it, don't label it), "empower" (sparingly).

Product references: "Class" not "Class Technologies" except in formal contexts. Features by outcome, not name.

**Anti-Patterns (Never Do)**

- No feature-dumping without outcome connections.
- No unsourced statistics or vague metrics.
- No aggressive sales language in educational content.
- No competitor bashing (position against "traditional meeting tools" as a category).
- No one-size-fits-all framing.
- No dismissing existing methods.
- No artificial urgency or fear-based messaging.
- No passive voice (find the actor).
- No AI writing patterns.

**How Class References Itself (4-step pattern)**

1. Introduce a real problem the audience faces.
2. Explain universal best practices (platform-agnostic).
3. Show how Class enables those practices specifically.
4. Support with customer quote or data point.

Rule count per R0-Skills: 8 voice constants + 8 core terminology rules + 12 anti-patterns + 1 product-reference pattern = 29 discrete rules.

### 3.4 Synthesizer Output Schema

The Synthesizer produces a single markdown document conforming to `MemoFrontmatter` Zod schema (defined in `docs/architecture/delivery.md`). The memo body MUST contain a `## Falsifiers` section with at least one "what would change this reco" item. Empty falsifiers → Verifier FAILS dimension-5.

---

## Section 4 — Verifier Prompt (THE Keystone)

**Source**: `docs/architecture/prompts.md` §Verifier prompt + `docs/research/phase-r-decisions.md` §Decision 2.  
**File**: `apps/utility/src/prompts/verifier.prompt.md`  
**AgentDefinition**: `VerifierDefinition.modelHint = 'claude-opus-4-7'` (from ADR-0004 §2.10). Opus only — Sonnet is not acceptable for the keystone anti-sycophancy function.

### 4.1 The 5 Anti-Sycophancy Patterns

These five patterns operate simultaneously. No single pattern is sufficient alone.

**Pattern 1 — Structural isolation from lens reasoning traces** (B3 mitigation)

The Verifier receives ONLY: `{memoMarkdown, lensOutputs[6], toolCallAuditTrail, positionMetadata, redTeamOutput, steelmanOutput}` via `buildVerifierInput()` assembler (ADR-0004 §5). The assembler fails closed — `VerifierInputContractViolation` if any required field is absent. The Verifier does NOT see:
- Lens reasoning traces or chain-of-thought
- Partial message streams
- Any agent's system prompt
- Any intermediate reasoning from Synthesizer

This is structural, not advisory. The utility process never writes reasoning traces to SQLite — only schema-validated `output_json` persists. The Verifier's prompt says explicitly: "If you find yourself with information that isn't in the inputs above, STOP and report a contract violation."

**Pattern 2 — Forced JSON output schema with mandatory falsifiers + missing-data flags**

The Verifier returns ONLY JSON. No prose. The Zod schema rejects null on every required field. An empty `falsifier.present = false` does not cause a parse failure (it's a valid boolean), but it does cause the `falsifier` dimension score to be 0 and a `failure_reasons` entry to be appended. The test in `verifier-canary.spec.ts` asserts that a memo with an unsourced quantitative claim produces `claims_unverified` with that claim.

**Pattern 3 — Higher-reasoning model than the lenses**

Verifier uses `claude-opus-4-7`. All six lenses use `claude-sonnet-4-6` (ADR-0004 §2.1–2.6). The model asymmetry means the Verifier can detect reasoning errors the lenses made. Source: `docs/research/phase-r-decisions.md` §Decision 2; ADR-0004 §9.1 Alternative A5.

**Pattern 4 — Schema-rejection of null returns on required fields**

The `VerifierOutputSchema` (specified in §4.3 below) treats every required field as non-nullable. `z.string()` not `z.string().optional()`. A Verifier response that omits `ship_status` or `rigor_score` fails Zod parse and is treated as a contract violation, not a passable result.

**Pattern 5 — Planted-claim canary on every CI build**

Specified in Section 5 below. The canary is the empirical proof that the Verifier prompt is working. A theoretically-correct prompt that fails the canary is not correct.

### 4.2 Verifier System Prompt (Full Text)

```
You are the Verifier of Russell Teter's C-Suite. Your job is to GRADE the
Synthesizer's memo against the evidence the lenses gathered.

YOU RECEIVE (the Verifier Input Contract — assembler fails closed if any missing):
1. The Synthesizer's draft memo markdown.
2. The STRUCTURED OUTPUTS of every lens that contributed (NOT their reasoning
   traces — you are STRUCTURALLY BLIND to lens chain-of-thought).
3. The complete tool-call audit trail: every tool call with args, result, and
   source_id.
4. Metadata of every position the memo cites: id, current confidence, last
   retested date, supersession status.
5. The Red-Team output (in full).
6. The Steelman output (in full).

YOU DO NOT SEE: lens reasoning traces, intermediate prompts, any lens's private
thoughts. You see the structured outputs they produced and the tool calls they
ran. THIS IS LOAD-BEARING. If you find yourself with information that isn't in
the inputs above, STOP and output:
{"error": "VerifierInputContractViolation", "missing": ["<source of unexpected info>"]}

YOUR JOB: GRADE the memo on five dimensions and produce a rigor score plus a
PASS/FAIL decision per dimension.

DIMENSIONS (with weights):
- Claim-source binding (35): every quantitative or named-entity claim has a
  source_id that maps to a tool_call whose result corroborates the claim. Run
  the isQuantOrNamed() classifier logic on each memo claim: if the claim
  contains a number (dollar amount, percentage, count, date) or a named entity
  (person, company, product, brand), it requires a source_id. For each such
  claim, verify the cited source exists in the tool-call audit trail and
  corroborates the claim value.
- Coverage (20): does the memo cite from all lenses that ran? Are any lenses'
  load-bearing findings absent from the memo body?
- Red-team integration (15): does the memo address the Red-Team's failure modes
  or explicitly note why they're discounted? Empty/perfunctory red-team
  integration fails this dimension.
- Calibration freshness (15): does the memo cite any positions whose
  last_retested date is >90 days old? Citing stale positions without a re-test
  fails this dimension.
- Falsifier completeness (15): the memo's reco MUST include falsifiers —
  what evidence would flip the recommendation. Empty falsifiers fail this
  dimension. (Anti-sycophancy: a memo that says "X is the right call" without
  saying "I'd change my mind if Y" is rubber-stamp drafting.)

ANTI-SYCOPHANCY DISCIPLINES:
1. Empty falsifier rejection. If a memo's falsifiers section is empty or absent,
   dimension-5 scores 0. No exceptions.
2. Missing-data flag rejection. If a memo claims a quantitative or named-entity
   fact without citing a source_id, dimension-1 deducts for that claim.
3. Forced JSON output schema. You return ONLY JSON conforming to the schema
   below. No prose. The schema rejects null returns on required fields.
4. You do not see lens reasoning. You cannot rubber-stamp because you cannot
   read what the lens "thought." You only see what it OUTPUT and what tools
   it CALLED. This is the structural guarantee against sycophancy.

REQUIRED OUTPUT (Zod-validated; this is the ONLY valid output format):
{
  "rigor_score": <0-100 integer>,
  "ship_status": "clean" | "draft" | "fail",
  "dimensions": {
    "claim_source": {
      "score": <0-35>,
      "claims_total": <int>,
      "claims_verified": <int>,
      "claims_unverified": [{"claim_excerpt": "<...>", "issue": "<reason>"}]
    },
    "coverage": {
      "score": <0-20>,
      "lenses_run": [<role>],
      "lenses_cited_in_memo": [<role>],
      "missing_findings": ["<load-bearing lens finding not in memo>"]
    },
    "red_team": {
      "score": <0-15>,
      "addressed": <int>, "unaddressed": <int>,
      "unaddressed_details": ["<...>"]
    },
    "calibration": {
      "score": <0-15>,
      "stale_position_citations": [{"position_id": "<id>", "age_days": <int>}]
    },
    "falsifier": {
      "score": <0-15>,
      "present": <bool>,
      "quality": "<missing|perfunctory|strong>"
    }
  },
  "failure_reasons": ["<one per dimension that scored below its passing band>"],
  "draft_path_recommendation": "<if ship_status=draft, path with .draft suffix>",
  "verifier_notes": "<any flags for next loop>"
}

THRESHOLDS:
- Strategic option evaluation, Restructure decision: >= 80 → clean; 70-79 → draft.
- Open Q&A: cap at 85 regardless (DECOMPOSED AD-HOC stamp).
- All others: >= 70 → clean; < 70 → draft.

If the input contract is violated (missing required input), output:
{"error": "VerifierInputContractViolation", "missing": [<input name>]}
```

### 4.3 Verifier Output Zod Schema

Replaces the stub in ADR-0004 §2.10's `VerifierOutputSchema`. This is the authoritative schema.

```typescript
// packages/shared-types/src/verifier-output.ts

import { z } from 'zod';

export const VerifierDimensionsSchema = z.object({
  claim_source: z.object({
    score: z.number().int().min(0).max(35),
    claims_total: z.number().int().min(0),
    claims_verified: z.number().int().min(0),
    claims_unverified: z.array(z.object({
      claim_excerpt: z.string().min(1),
      issue: z.string().min(1),
    })),
  }),
  coverage: z.object({
    score: z.number().int().min(0).max(20),
    lenses_run: z.array(z.string()),
    lenses_cited_in_memo: z.array(z.string()),
    missing_findings: z.array(z.string()),
  }),
  red_team: z.object({
    score: z.number().int().min(0).max(15),
    addressed: z.number().int().min(0),
    unaddressed: z.number().int().min(0),
    unaddressed_details: z.array(z.string()),
  }),
  calibration: z.object({
    score: z.number().int().min(0).max(15),
    stale_position_citations: z.array(z.object({
      position_id: z.string(),
      age_days: z.number().int().min(0),
    })),
  }),
  falsifier: z.object({
    score: z.number().int().min(0).max(15),
    present: z.boolean(),
    quality: z.enum(['missing', 'perfunctory', 'strong']),
  }),
});

export const VerifierOutputSchema = z.object({
  rigor_score: z.number().int().min(0).max(100),
  ship_status: z.enum(['clean', 'draft', 'fail']),
  dimensions: VerifierDimensionsSchema,
  failure_reasons: z.array(z.string()),
  draft_path_recommendation: z.string().optional(),
  verifier_notes: z.string(),
});

export const VerifierContractViolationSchema = z.object({
  error: z.literal('VerifierInputContractViolation'),
  missing: z.array(z.string()),
});

// Union: valid output OR contract violation
export const VerifierResponseSchema = z.union([
  VerifierOutputSchema,
  VerifierContractViolationSchema,
]);

export type VerifierOutput = z.infer<typeof VerifierOutputSchema>;
export type VerifierContractViolation = z.infer<typeof VerifierContractViolationSchema>;
export type VerifierResponse = z.infer<typeof VerifierResponseSchema>;
```

**Location**: `packages/shared-types/src/verifier-output.ts`

This supersedes the stub `VerifierOutputSchema` in ADR-0004 §2.10. The Ch.3 `VerifierDefinition.outputSchema` MUST be updated to reference this schema in the implementation pass.

---

## Section 5 — Planted-Claim Canary Fixture

**Source**: `docs/architecture/prompts.md` §Planted-claim canary; `docs/research/phase-r-decisions.md` §Decision 2 pattern #5; BLOCKERS B3.  
**Fixture**: `tests/fixtures/canary-memo.md` — already in repo from Ch.0 scaffold. DO NOT MODIFY. The planted claim "Q3 ARR was $43M." in the Executive Summary section is load-bearing.  
**Test**: `tests/unit/verifier-canary.spec.ts`

### 5.1 Canary Fixture Contract

The canary memo at `tests/fixtures/canary-memo.md` contains:
- A quantitative claim "Q3 ARR was $43M." in the Executive Summary with NO corresponding `source_id` in the tool-call audit trail.
- The frontmatter `status: clean` and `failure_reasons: []` — set intentionally wrong to verify the Verifier OVERRIDES the Synthesizer's self-assessment.
- A sourced claim in the Claims section (for `sf-opportunity-q3-renewals`) to ensure the Verifier doesn't simply fail all claims — it must distinguish sourced from unsourced.

### 5.2 Canary Test Specification

```typescript
// tests/unit/verifier-canary.spec.ts

import { describe, it, expect } from 'vitest';
import { buildVerifierInput } from '../../apps/utility/src/verifier-assembler.js';
import { runVerifier } from '../../apps/utility/src/agents/verifier-runner.js';
import { loadCanaryFixture } from '../fixtures/canary-loader.js';

describe('Verifier planted-claim canary (B3 P0 regression guard)', () => {
  it('catches the planted unsourced quantitative claim $43M', async () => {
    const fixture = await loadCanaryFixture();          // loads canary-memo.md + stub tool audit trail
    const verifierInput = buildVerifierInput(fixture);  // assembler contracts verified
    const out = await runVerifier(verifierInput);        // STUB_MODE=replay in CI

    // PRIMARY ASSERTION: unsourced $43M claim MUST appear in claims_unverified
    expect(out.dimensions.claim_source.claims_unverified).toContainEqual(
      expect.objectContaining({
        claim_excerpt: expect.stringContaining('$43M'),
        issue: expect.stringMatching(/no source_id|unverified|unsourced/i),
      })
    );

    // SECONDARY: ship_status MUST be 'draft' (not 'clean')
    expect(out.ship_status).toBe('draft');

    // TERTIARY: claim_source score must be < 35 (unsourced claim costs points)
    expect(out.dimensions.claim_source.score).toBeLessThan(35);
  });

  it('does NOT fail on the sourced claim sf-opportunity-q3-renewals', async () => {
    const fixture = await loadCanaryFixture();
    const verifierInput = buildVerifierInput(fixture);
    const out = await runVerifier(verifierInput);

    // The sourced claim ($1.2M weighted pipeline) must NOT appear in claims_unverified
    const unverified = out.dimensions.claim_source.claims_unverified;
    const hasSourcedClaimFlagged = unverified.some(u =>
      u.claim_excerpt.includes('1.2M') || u.claim_excerpt.includes('sf-opportunity-q3-renewals')
    );
    expect(hasSourcedClaimFlagged).toBe(false);
  });

  it('returns only valid JSON conforming to VerifierOutputSchema', async () => {
    const { VerifierOutputSchema } = await import('../../packages/shared-types/src/verifier-output.js');
    const fixture = await loadCanaryFixture();
    const verifierInput = buildVerifierInput(fixture);
    const out = await runVerifier(verifierInput);

    // Schema parse MUST NOT throw
    expect(() => VerifierOutputSchema.parse(out)).not.toThrow();
  });
});
```

**CI requirement**: This test runs on every CI build. It uses `STUB_MODE=replay` in CI. The stub fixture at `tests/fixtures/lens-outputs/canary-run/Verifier.json` is the RECORD-mode capture of the Verifier against the canary memo. Ch.4 implementation MUST capture this fixture via `STUB_MODE=record` before the test suite is runnable in CI. This fixture is the living proof the Verifier works.

**What "goes red" means**: If a future model update makes the Verifier lenient — if it passes the canary with `ship_status: 'clean'` — this test fails and the build is blocked. No deploy proceeds until the canary is re-captured with a Verifier prompt that restores rigor.

**Canary fixture maintenance rule**: Never modify `tests/fixtures/canary-memo.md`. If the memo needs updating for any reason, create a new fixture and a new canary test. The original canary is permanent.

---

## Section 6 — `rigorScore()` Pure Function

**Source**: `docs/architecture/prompts.md` §rigorScore() + locked test table.  
**Implementation**: `apps/utility/src/scoring/rigorScore.ts`  
**Tests**: `tests/unit/scoring/rigorScore.spec.ts` (loads `tests/fixtures/rigor-cases.json`)

### 6.1 Function Specification

```typescript
// apps/utility/src/scoring/rigorScore.ts
// Pure function. No side effects. Same input → same output, run after run.
// Implements the 5-dimension weighted formula from PRD §5 locked.

import type { VerifierOutput } from '../../packages/shared-types/src/verifier-output.js';

export type PlaybookId =
  | 'strategic_option'
  | 'restructure_decision'
  | 'board_narrative'
  | 'cash_lever'
  | 'gtm_reallocation'
  | 'stakeholder_prep'
  | 'pre_mortem'
  | 'quick_read'
  | 'open_qa';

/**
 * Computes rigor score from Verifier dimension scores.
 * Formula: 35 claim_source + 20 coverage + 15 red_team + 15 calibration + 15 falsifier
 * Maximum: 100. Minimum: 0.
 * open_qa is capped at 85 post-computation (caller must apply rigorCap).
 */
export function rigorScore(input: VerifierOutput): number {
  const { claim_source, coverage, red_team, calibration, falsifier } = input.dimensions;
  return claim_source.score + coverage.score + red_team.score
       + calibration.score + falsifier.score;
}

/**
 * Returns the minimum score required for 'clean' ship_status on this playbook.
 * strategic_option + restructure_decision: 80.
 * open_qa: 85 (cap, not threshold — applyRigorCap first).
 * All others: 70.
 */
export function rigorThreshold(playbook: PlaybookId): number {
  if (playbook === 'strategic_option' || playbook === 'restructure_decision') return 80;
  if (playbook === 'open_qa') return 85;
  return 70;
}

/**
 * Clamps open_qa scores to 85 maximum. Other playbooks: no cap.
 * Call BEFORE comparing to threshold.
 */
export function applyRigorCap(score: number, playbook: PlaybookId): number {
  if (playbook === 'open_qa') return Math.min(score, 85);
  return score;
}

/**
 * Determines ship_status. quick_read bypasses Verifier entirely — returns 'quick_read'.
 * open_qa 'clean' result carries 'ad_hoc' stamp (separate from ship_status; surfaced in memo header).
 */
export function shipStatus(
  score: number,
  playbook: PlaybookId,
): 'clean' | 'draft' | 'quick_read' {
  if (playbook === 'quick_read') return 'quick_read';  // bypass path; Verifier never called
  const capped = applyRigorCap(score, playbook);
  const threshold = rigorThreshold(playbook);
  return capped >= threshold ? 'clean' : 'draft';
}
```

### 6.2 12-Case Locked Test Table

Source: `tests/fixtures/rigor-cases.json` (Ch.0 scaffold; matches `docs/architecture/prompts.md` §12-case locked test table exactly).

| # | claim_src | coverage | red_team | calibration | falsifier | Total | Playbook | Expected ship |
|---|---|---|---|---|---|---|---|---|
| 1 | 35 | 20 | 15 | 15 | 15 | 100 | strategic_option | clean (≥80) |
| 2 | 35 | 20 | 15 | 15 | 0 | 85 | strategic_option | clean |
| 3 | 35 | 20 | 15 | 15 | 0 | 85 | strategic_option | clean (stability) |
| 4 | 25 | 18 | 12 | 10 | 10 | 75 | strategic_option | DRAFT (<80) |
| 5 | 25 | 18 | 12 | 10 | 10 | 75 | gtm_reallocation | clean (≥70) |
| 6 | 0 | 20 | 15 | 15 | 15 | 65 | gtm_reallocation | DRAFT (<70) |
| 7 | 35 | 0 | 15 | 15 | 15 | 80 | gtm_reallocation | clean |
| 8 | 35 | 20 | 0 | 15 | 15 | 85 | restructure_decision | clean (≥80) |
| 9 | 35 | 20 | 15 | 0 | 15 | 85 | board_narrative | clean (≥70) |
| 10 | 35 | 20 | 15 | 15 | 0 | 85 | open_qa | clean (cap=85, total=85) |
| 11 | 35 | 20 | 15 | 15 | 15 | 100 | open_qa | clean (capped→85; ad_hoc stamp) |
| 12 | null | null | null | null | null | null | quick_read | quick_read (bypass path) |

**Test assertion for Case 12**: `rigorScore()` MUST NOT be called; `shipStatus('any', 'quick_read')` returns `'quick_read'`; no `VerifierInput` is assembled.

**Test assertion for Case 11**: `rigorScore(input)` returns 100; `applyRigorCap(100, 'open_qa')` returns 85; `shipStatus(100, 'open_qa')` returns `'clean'`; memo header gets `ad_hoc` stamp.

**Fixture consistency rule**: `tests/fixtures/rigor-cases.json` and `docs/architecture/prompts.md` §12-case table are the dual sources of truth. Any modification requires a synchronized commit touching both files.

---

## Section 7 — `isQuantOrNamed()` Classifier (B10)

**Source**: `docs/architecture/prompts.md` §isQuantOrNamed() + `docs/research/phase-r-decisions.md` §Decision 2 (5 edge cases).  
**Implementation**: `apps/utility/src/scoring/isQuantOrNamed.ts`  
**Tests**: `tests/unit/scoring/isQuantOrNamed.spec.ts` (50+ cases)

### 7.1 Function Specification

```typescript
// apps/utility/src/scoring/isQuantOrNamed.ts
// Deterministic classifier — no LLM call. Two runs of the same text return identical results.
// Load-bearing for rigor scoring: 35% of total weight (claim_source dimension).

import { NAMED_ENTITY_REGISTRY } from '../registry/namedEntities.js';

/**
 * Returns true if the claim text contains a quantitative value or named entity
 * that requires a source_id citation.
 *
 * TRUE cases (require citation):
 *   - Dollar amounts with digits: "$43M", "$1.4M", "$111,766"
 *   - Percentages with digits: "47.9%", "15%"
 *   - Large numbers: "42 opportunities", "41 employees"
 *   - Named entities in NAMED_ENTITY_REGISTRY (companies, people, products, competitors)
 *   - Quantitative change verbs with numbers: "grew 23%", "declined by $2M"
 *
 * FALSE cases (do NOT require citation):
 *   - Dates in opinion claims: "by next quarter" → false (no numeric value)
 *   - Numbers in metaphors: "a thousand cuts" → false (idiomatic)
 *   - Currency abbreviation without digits: "$M range" → false (no specific digit)
 *   - Named entity in hypothetical: "if Barclays were to call" → TRUE
 *     (named entity detection fires regardless of hypothetical framing)
 *   - Percentage in projection with hedge: "ARR might grow 15% if renewals hold" → TRUE
 *     (15% is a specific quantitative value)
 */
export function isQuantOrNamed(claimText: string): boolean {
  // 1. Numeric literals with dollar sign + digits
  if (/\$\s*\d/.test(claimText)) return true;

  // 2. Percentages with digits (explicit numeric value)
  if (/\d+(\.\d+)?\s*%/.test(claimText)) return true;

  // 3. Large number literals (4+ digit sequences or comma-separated)
  if (/\b\d{1,3}(,\d{3})+\b/.test(claimText)) return true;

  // 4. Small explicit counts (context-dependent; matches N + unit pattern)
  //    e.g., "42 opportunities", "41 employees", "16 months"
  if (/\b\d+\s+(opportunities|employees|accounts|months|weeks|days|customers|reps|seats)\b/i.test(claimText)) return true;

  // 5. Named entity lookup in NAMED_ENTITY_REGISTRY
  //    Fires for hypotheticals too (edge case 2): "if Barclays were to call" → true
  for (const entity of NAMED_ENTITY_REGISTRY) {
    if (claimText.includes(entity)) return true;
  }

  // 6. Quantitative change verbs with numeric values
  if (/\b(grew|declined|increased|fell|dropped|spiked|rose|cut|reduced)\s+(by\s+)?\$?\d/.test(claimText)) return true;

  // Edge case guards:
  // "a thousand cuts" → no digit-preceded pattern; falls through to false
  // "$M range" → \$\s*\d requires a digit after $; "$M" has no digit after $ → false
  // "by next quarter" → no numeric value; no named entity → false

  return false;
}
```

### 7.2 Five R2 Edge Cases (Must Be in Test Suite)

Source: `docs/research/phase-r-decisions.md` §Decision 2; `docs/architecture/prompts.md` §isQuantOrNamed.

| Edge case | Input | Expected | Rationale |
|---|---|---|---|
| 1 | "We should close this by next quarter." | false | "next quarter" has no numeric value; opinion claim |
| 2 | "If Barclays were to call tomorrow, we'd need a term sheet." | true | "Barclays" is in NAMED_ENTITY_REGISTRY; named entity fires regardless of hypothetical framing |
| 3 | "This is death by a thousand cuts." | false | "thousand" is idiomatic; no digit-preceded pattern matches |
| 4 | "ARR might grow 15% if renewals hold." | true | "15%" is an explicit numeric percentage; hedge "might" does not neutralize the claim |
| 5 | "The cost is in the $M range." | false | "$M" has no digit after "$"; the regex `\$\s*\d` requires a digit |

### 7.3 50+ Test Cases Breakdown

The full `tests/unit/scoring/isQuantOrNamed.spec.ts` suite must include:

- 5 R2 edge cases (above) — marked with `// R2-EDGE-N` comments
- 10+ true cases: dollar amounts, percentages, named entities (Barclays, Holdco, Class Technologies, NetSuite, Salesforce, AWS, Chorus)
- 10+ true cases: counts, dates with specific numbers ("July 26, 2026"), explicit ARR figures
- 10+ false cases: vague qualitative claims ("strong pipeline"), relative comparisons ("bigger than last quarter"), idiomatic numbers
- 5+ false cases: currency abbreviation without digits, "next quarter" dates, metaphors
- 5+ mixed cases: hypothetical + named entity (should be true), hedge + specific number (should be true)
- 5+ registry boundary cases: entities just outside the registry (e.g., "Barclays" in registry vs "British bank" not in registry)

Total minimum: 50 cases. Implementation pass must achieve this count.

---

## Section 8 — NAMED_ENTITY_REGISTRY Pre-Load (B3 R2)

**Source**: `docs/research/phase-r-decisions.md` §Decision 2 NAMED_ENTITY_REGISTRY requirement; BLOCKERS B3; `docs/architecture/prompts.md` §isQuantOrNamed.  
**Implementation**: `apps/utility/src/registry/namedEntities.ts`

### 8.1 Registry Sources (Build-Time + Runtime)

The registry is built from three sources at utility-process startup:

| Source | Path | Content | Update trigger |
|---|---|---|---|
| Stakeholder files | `vault/stakeholders/*.md` | 13 stakeholder canonical_names (per R0-Knowledge §6 — stakeholder schema from `Strategic_AI_Stakeholder_Workstream_Adversarial.md`) | chokidar `vault.changed` on any `stakeholders/` file |
| Turnaround library | `business-planning/turnaround_operating_library.md` | Company names from case studies: Apple, Netflix, Microsoft, Domino's, Best Buy, IBM, Adobe, Slack, Coursera, Instructure, PowerSchool; framework authors: Grove, Helmer, Christensen, McKinsey, BCG, Collins, Drucker, Campbell, Ramanujam | Static read at startup; no live reload (library is stable) |
| Competitor watch | `vault/adversarial/competitor-watch/` | Competitor canonical names from competitor-watch directory | chokidar `vault.changed` on any `competitor-watch/` file |

**Pre-seeded entities** (known at build time, hardcoded as fallback when vault not yet initialized):

```typescript
const BOOTSTRAPPED_ENTITIES: string[] = [
  // Capital structure
  'Barclays', 'Holdco',
  // Class Technology products + systems
  'Class Technologies', 'Class', 'Zoom', 'Microsoft Teams', 'NetSuite', 'Salesforce',
  'PowerBI', 'AWS', 'Chorus', 'Collaborate',
  // Key people (from operating model spine)
  'Chasen',
  // Strategic frameworks (named authors)
  'Campbell', 'Ramanujam', 'Bessemer',
  // Class AWS orgs
  'BillingAccess',
];
```

These bootstrapped entities ensure `isQuantOrNamed()` works correctly before vault is initialized on first run.

### 8.2 Module Specification

```typescript
// apps/utility/src/registry/namedEntities.ts

import chokidar from 'chokidar';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * NAMED_ENTITY_REGISTRY is the in-memory set of entity strings consulted by isQuantOrNamed().
 * Mutable by design — updated on vault change events without process restart.
 * Exported as a Set for O(n) iteration (matches prompts.md spec).
 */
export let NAMED_ENTITY_REGISTRY: string[] = [...BOOTSTRAPPED_ENTITIES];

/**
 * Loads the registry from vault sources.
 * Called at utility-process startup (before any run can begin).
 * Idempotent — safe to call multiple times.
 */
export async function loadNamedEntityRegistry(vaultRoot: string): Promise<void> {
  const entities = new Set<string>(BOOTSTRAPPED_ENTITIES);

  // 1. Stakeholder files
  const stakeholderDir = path.join(vaultRoot, 'stakeholders');
  try {
    const files = await fs.readdir(stakeholderDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const content = await fs.readFile(path.join(stakeholderDir, file), 'utf-8');
      const match = content.match(/^canonical_name:\s*(.+)$/m);
      if (match?.[1]) entities.add(match[1].trim());
    }
  } catch {
    // stakeholders/ not yet initialized — use bootstrapped entities; not a startup failure
  }

  // 2. Competitor watch
  const competitorDir = path.join(vaultRoot, 'adversarial', 'competitor-watch');
  try {
    const files = await fs.readdir(competitorDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const content = await fs.readFile(path.join(competitorDir, file), 'utf-8');
      const match = content.match(/^canonical_name:\s*(.+)$/m);
      if (match?.[1]) entities.add(match[1].trim());
    }
  } catch {
    // competitor-watch/ not yet initialized — not a startup failure
  }

  // 3. Turnaround library named entities — static extraction
  // (Hardcoded at build time from turnaround_operating_library.md — not re-read at runtime)
  const TURNAROUND_LIBRARY_ENTITIES = [
    'Apple', 'Netflix', 'Microsoft', 'Domino\'s', 'Best Buy', 'IBM', 'Adobe',
    'Slack', 'Coursera', 'Instructure', 'PowerSchool',
    'Grove', 'Helmer', 'Christensen', 'McKinsey', 'BCG', 'Collins', 'Drucker',
    'Campbell', 'Ramanujam', 'Bessemer',
  ];
  for (const e of TURNAROUND_LIBRARY_ENTITIES) entities.add(e);

  NAMED_ENTITY_REGISTRY = Array.from(entities);
}

/**
 * Registers chokidar watcher for vault changes.
 * Reloads the registry when stakeholders/ or competitor-watch/ files change.
 * Called once at utility-process startup, after loadNamedEntityRegistry().
 */
export function watchNamedEntityRegistry(vaultRoot: string): void {
  const watchPaths = [
    path.join(vaultRoot, 'stakeholders'),
    path.join(vaultRoot, 'adversarial', 'competitor-watch'),
  ];

  chokidar
    .watch(watchPaths, { persistent: true, ignoreInitial: true })
    .on('all', () => {
      // Non-blocking reload; errors logged, not thrown
      loadNamedEntityRegistry(vaultRoot).catch(err => {
        console.error('[namedEntities] reload failed:', err);
      });
    });
}
```

### 8.3 Startup Sequence

In `apps/utility/src/main.ts` (utility process entry point):

```typescript
// After vault path is resolved, before any run can begin:
await loadNamedEntityRegistry(resolvedVaultPath);
watchNamedEntityRegistry(resolvedVaultPath);
// Now isQuantOrNamed() is safe to call
```

The registry load is awaited — runs cannot begin until the registry is populated. This prevents a race condition where a run starts before vault entities are available.

---

## Section 9 — Red-Team + Steelman + Handoff + Run-Critic Prompts

**Source**: `docs/architecture/prompts.md` §Red-Team + §Steelman + §Handoff + §Run-Critic; run-critique rubric from `docs/research/R0-skill-inventory.md` §Run-Critique Rubric Dimensions.

### 9.1 Red-Team Prompt

**File**: `apps/utility/src/prompts/red-team.prompt.md`

```
You are the Red-Team. You receive the lens structured outputs. Your job: identify
the 3-7 highest-impact ways the synthesized reco could be wrong.

For each: state the failure mode, the early-warning signal that would indicate
it's happening, and the cost if it materializes uncorrected.

You do NOT see the Synthesizer's draft. You see only the lens outputs and the
audit trail.

OUTPUT (Zod-validated):
{"failure_modes": [{
  "mode": "<one sentence>",
  "early_warning": "<observable signal>",
  "cost_if_materialized": "<...>",
  "probability": "<low|med|high>"
}]}
```

Source: `docs/architecture/prompts.md` §Red-Team prompt (abridged).

### 9.2 Steelman Prompt

**File**: `apps/utility/src/prompts/steelman.prompt.md`

```
You are the Steelman. You receive the lens structured outputs. Your job: build
the strongest case AGAINST the apparent emerging reco — the argument a smart
critic at the next board meeting would make.

You do NOT see the Synthesizer's draft. You see only the lens outputs.

OUTPUT (Zod-validated):
{"counter_argument": "<paragraph>",
 "strongest_evidence_against": [{"point": "<...>", "source_id": "<id-if-from-tool>"}],
 "what_proponents_must_answer": ["<question>"]}
```

Source: `docs/architecture/prompts.md` §Steelman prompt (abridged).

### 9.3 Handoff Prompt

**File**: `apps/utility/src/prompts/handoff.prompt.md`

```
You are the Handoff Agent for Russell's C-Suite. Russell has accepted a decision
or shipped a memo and now wants it executed in Cowork. Your job: produce a
STRUCTURED EXECUTION BRIEF Cowork can pick up and run.

The brief MUST contain:
- Decision being executed (with traceback link to originating memo/decision id).
- Rationale chain (why this choice over alternatives).
- Specific deliverables (project plan / business plan / process docs / comms /
  owner-and-timeline assignments).
- Stakeholder context (who's involved, who has decision rights, who needs comms).
- Workstream context (which workstreams touch; what depends on this).
- Constraints + risk flags (budget, timing, dependencies, tripwires).
- Acceptance criteria (what "done" looks like).
- Named Cowork brand skills for any polished artifacts:
    - Excel financial models → class-brand-excel
    - PowerPoint decks → class-brand-presentations or class-ppt-cyan-light
    - PDFs / Word docs → class-brand-document
    - External-facing copy → class-brand-voice
    - Personal-facing copy → russell-voice
- Path the brief should land at: handoffs/<YYYY-MM-DD>-<slug>.md
- back-link to set on the originating artifact: executed_by: <handoff-path>

OUTPUT: a single markdown document conforming to the HandoffFrontmatter Zod
schema + the body template documented in delivery.md.
```

Source: `docs/architecture/prompts.md` §Handoff prompt. Framed from Chief of Staff perspective per `docs/research/phase-r-decisions.md` §Decision 10(d).

### 9.4 Run-Critic Prompt

**File**: `apps/utility/src/prompts/run-critic.prompt.md`

```
You are the Run-Critic. The run has shipped. Your job: critique THIS RUN on the
run-critique rubric and propose ONE improvement for the next run.

You receive: the full run state (lens outputs, tool calls, Synthesizer draft,
Verifier score breakdown).

RUBRIC DIMENSIONS (from run-critique skill — verbatim):

Dimension 1: Source rigor (weight 25%)
  Score 10 = every number tagged with connector + timestamp; every doctrine claim
             cited to the turnaround library by section; every stakeholder claim
             cited to a specific call/email/file.
  Score 1  = floating claims, hand-waved confidence, "according to industry
             research" with no citation.

Dimension 2: Lens balance (weight 20%)
  Score 10 = each lens produced a distinct, useful position; the reconciliation
             surfaced at least one real tension; no lens was a token paragraph.
  Score 1  = one lens drove the entire conclusion and the others were window dressing.

Dimension 3: Red-team sharpness (weight 20%)
  Score 10 = red team caught a specific named dependency, second-order effect,
             or fact-conflict that materially changed the position.
  Score 1  = red team raised generic concerns that didn't move anything.

Dimension 4: Deliverable usefulness (weight 20%)
  Default at run time: "deferred — assess in 7 days."
  Score 10 = Russell quoted from the deliverable in a real conversation, sent it
             forward, or it materially changed a decision.
  Score 1  = the deliverable was produced and never opened.

Dimension 5: Memory hygiene (weight 15%)
  Score 10 = every memory write had a source: field; positions went to positions/;
             facts went to MEMORY.md; conflicts properly superseded with audit trail.
  Score 1  = silent overwrites, missing sources, beliefs filed as facts.

Composite = weighted average.
90-100: gold standard. 75-89: solid, one improvement. 50-74: acceptable, one
dimension flagged. 0-49: weak; reflect on topic choice.

OUTPUT (Zod-validated):
{
  "run_id": "<id>",
  "rubric_scores": {
    "source_rigor": <0-10>,
    "lens_balance": <0-10>,
    "red_team_sharpness": <0-10>,
    "deliverable_usefulness": <0-10>,
    "memory_hygiene": <0-10>
  },
  "composite_score": <0-100 weighted average>,
  "strongest": "<what worked>",
  "weakest": "<what failed>",
  "proposed_improvement": "<one concrete change for next run>",
  "doctrine_amendment_candidate": "<if pattern repeats; else null>"
}
```

Source: `docs/research/R0-skill-inventory.md` §5 run-critique §Five-dimension rubric (verbatim). The dimension names (`source_rigor`, `lens_balance`, `red_team_sharpness`, `deliverable_usefulness`, `memory_hygiene`) and weights (25/20/20/20/15) are locked from the skill source. Composite score formula: `(source_rigor * 25 + lens_balance * 20 + red_team_sharpness * 20 + deliverable_usefulness * 20 + memory_hygiene * 15) / 100`.

---

## Section 10 — Acceptance Criteria

Map to ROADMAP §Ch.4 exit criteria. All tests run in `STUB_MODE=replay`.

| # | Test | File | Assertion | Prerequisite |
|---|---|---|---|---|
| AC-1 | Canary: Verifier catches planted $43M claim | `tests/unit/verifier-canary.spec.ts` | `claims_unverified` contains `$43M`; `ship_status = 'draft'`; `claim_source.score < 35` | Section 5; canary stub fixture captured |
| AC-2 | 12-case rigorScore table reproduces exactly | `tests/unit/scoring/rigorScore.spec.ts` | Each row in `rigor-cases.json`: `rigorScore()` + `applyRigorCap()` + `shipStatus()` match expected values | Section 6 |
| AC-3 | isQuantOrNamed 50+ cases pass | `tests/unit/scoring/isQuantOrNamed.spec.ts` | All 50+ cases return expected bool; 5 R2 edge cases all pass | Section 7; NAMED_ENTITY_REGISTRY bootstrapped with Barclays |
| AC-4 | NAMED_ENTITY_REGISTRY loads at startup | `tests/unit/registry/namedEntities.spec.ts` | `loadNamedEntityRegistry(vaultRoot)` resolves; NAMED_ENTITY_REGISTRY contains bootstrapped entities; vault entities added when files present | Section 8 |
| AC-5 | NAMED_ENTITY_REGISTRY reloads on stakeholder change | `tests/unit/registry/namedEntities.spec.ts` | Write a new `canonical_name:` to a stakeholder fixture file; registry update triggered within 1s | Section 8; chokidar wired |
| AC-6 | All 12 prompts conform to AgentDefinition outputSchema | `tests/unit/agents/prompt-schema-compliance.spec.ts` | For each of 12 roles, seed fixture output parses against the role's `outputSchema`; no Zod errors | Sections 1-4, 9; seed fixtures from Ch.3 (ADR-0004 §6.4) |
| AC-7 | Verifier VerifierOutputSchema parses canary output | `tests/unit/verifier-canary.spec.ts` | `VerifierOutputSchema.parse(canaryOutput)` does not throw | Section 4.3; VerifierOutputSchema exported from shared-types |
| AC-8 | CRO prompt contains corrected stage labels (B19) | `tests/unit/prompts/cro-stage-labels.spec.ts` | Read `cro.prompt.md`; assert contains `Verbal Agreement`, `Verbal Approval`, `Contracting`, `Quote in Review`, `Negotiation`, `Renewal Quote Sent`, `Qualified Renewal`; assert does NOT contain `S4`, `S5`, `Commit/Best Case` | Section 1.4 |
| AC-9 | Run-Critic rubric dimensions and weights correct | `tests/unit/agents/run-critic-rubric.spec.ts` | Fixture run-critic output with known dimension scores produces expected composite (25/20/20/20/15 weights) | Section 9.4 |
| AC-10 | quick_read bypasses rigorScore entirely | `tests/unit/scoring/rigorScore.spec.ts` (case 12) | `shipStatus(anyScore, 'quick_read')` returns `'quick_read'`; `rigorScore` is not called | Section 6.1 |

---

## Section 11 — Considered Alternatives + UNKNOWN

### 11.1 Alternatives Considered

**A1: LLM-based `isQuantOrNamed()` classifier**

Considered using a lightweight LLM call to classify claims. Rejected:
- Determinism requirement: two runs of the same memo must produce identical rigor scores. LLM non-determinism (even at temperature=0, model updates change outputs) would cause score drift over time.
- Performance: 50+ classification calls per Verifier run would add 5-10 seconds to every run.
- B10 blocker is explicit: "deterministic — no LLM." The regex + NAMED_ENTITY_REGISTRY approach fulfills the requirement.

**A2: Verifier model = Sonnet 4.6**

Considered using Sonnet to reduce token cost (Verifier is the second-most expensive agent after Synthesizer). Rejected:
- Phase R Decision 2 and ADR-0004 §9.1 A5 both confirm Opus 4.7 for Verifier is load-bearing. The asymmetry between Opus (Verifier) and Sonnet (lenses) is the model-capability gap that prevents rubber-stamping.
- The planted-claim canary captures this empirically — if Sonnet were used, the canary fixture must still pass. Implementation MUST verify canary passes before declaring the model choice acceptable.
- Default remains Opus 4.7 until canary evidence says otherwise.

**A3: Baking voice rules into the lens prompts (not just Synthesizer)**

Considered requiring each lens to produce voice-compliant output to reduce Synthesizer workload. Rejected:
- Lens structured outputs are JSON, not prose. Voice rules apply to prose generation, which is the Synthesizer's job.
- Adding voice rules to JSON-output prompts would be noise that could confuse the structured output requirement.

**A4: Named entity extraction via NLP library (spaCy, compromise.js)**

Considered parsing claim text with NLP NER to detect named entities dynamically instead of using a registry. Rejected:
- Generic NLP NER has high false-positive rate on domain-specific entities ("Class", "Collaborate") that overlap with common words.
- The NAMED_ENTITY_REGISTRY approach is domain-specific and auditable: every entity in the registry is traceable to a source (stakeholder file, competitor file, turnaround library).
- Adds a Python/npm dependency for marginal gain when the registry covers the known Class domain well.

**A5: CPO prompt sourced from Invocation Guide**

The CPO lens has no equivalent in `Strategic_AI_Invocation_Guide.md`. The guide documents 5 lenses (CEO/CFO/CRO/CMO/COS). The CPO frame is therefore authored fresh against the turnaround library and PRD §6, not extracted verbatim. Source for this decision: `docs/architecture/prompts.md` §CPO lens.

### 11.2 UNKNOWN Items

| ID | Area | Description | Owner | Dependency |
|---|---|---|---|---|
| U-1 | CRO committed stages | R1's live Salesforce enumeration confirms the corrected labels used in Section 1.4. B19 specifies `Verbal Agreement`, `Verbal Approval`, `Contracting`, `Quote in Review`, `Negotiation` (new-biz) + `Renewal Quote Sent`, `Qualified Renewal` (renewal). These labels come from `docs/research/R0-skill-inventory.md` §weekly-cash-forecast Known bugs. Full enumeration from R1 live query should be confirmed with Russell before Ch.5 live run. | Ch.5 preflight | `docs/research/R1-connector-reality.md` confirmed labels |
| U-2 | Verifier canary stub fixture | The canary test requires a stub fixture at `tests/fixtures/lens-outputs/canary-run/Verifier.json` captured via `STUB_MODE=record`. This fixture does not exist yet — it requires a live Verifier invocation against the canary memo. Ch.4 implementation MUST capture it before AC-1 can pass in CI. | Ch.4 implementation | Live Anthropic API key + `STUB_MODE=record` run |
| U-3 | 13 stakeholder canonical names | R0-Knowledge §6 references 13 stakeholder files in `vault/stakeholders/`. Their exact canonical names (for NAMED_ENTITY_REGISTRY bootstrapping) are UNKNOWN without reading the vault files. The bootstrapped entities list in Section 8.1 includes only entities inferable from operating model docs. The load at startup fills this gap. | Startup (no blocker) | vault initialized |
| U-4 | `Account_Vertical_Segment__c` field | R0-Skills §3 renewal-forecast finding: `Account.Account_Vertical_Segment__c` used in segment cuts is NOT verified in R1's live Salesforce field list. CRO lens uses `Account_Type__c` (verified) for now. If Russell needs segment cuts by `Account_Vertical_Segment__c`, this field requires live verification. | Ch.5 / CRO verification | R1 field list confirmation |
| U-5 | BaseHookInput SDK fields | Inherited from ADR-0004 U-1: `BaseHookInput` complete field list is UNKNOWN pending Claude Agent SDK source confirmation. Does not affect Ch.4 prompts but affects Ch.3 implementation. | Ch.3 implementation | Context7 SDK source |
| U-6 | CPO WS-08 repositioning thesis location | CPO prompt references `Strategic_AI_Cross_Claude_Spine.md / Strategic_AI_Stack_Inventory.md` for the AI-native repositioning thesis. R0-Knowledge §1 documents WS-08 is in the workstream library. The exact vault path for WS-08's full context is UNKNOWN until Ch.5 vault read. | Ch.5 | vault initialized |

---

## Implementation Notes for Ch.4 Runtime + Test

1. Replace all `AgentDefinition.systemPrompt = 'STUB — see Ch.4'` in `apps/utility/src/agents/` with the prompt file paths defined in Sections 1-4, 9. Each prompt file is loaded at startup and injected at definition time — not at invocation time.
2. Add `VerifierOutputSchema` to `packages/shared-types/src/verifier-output.ts` and update `VerifierDefinition.outputSchema` reference accordingly. The stub in ADR-0004 §2.10 is superseded.
3. Implement `rigorScore.ts`, `isQuantOrNamed.ts`, `namedEntities.ts` as pure functions with no cross-dependencies (import order: `namedEntities` → `isQuantOrNamed`; `verifier-output` → `rigorScore`).
4. Capture the canary stub fixture (`STUB_MODE=record` against canary-memo.md) before running CI. AC-1 cannot pass without this fixture.
5. `CRO.prompt.md` MUST NOT contain the original Invocation Guide text verbatim for the stage-label line — apply B19 correction as specified in Section 1.4. This is a hard requirement, not advisory.
6. The prompt files at `apps/utility/src/prompts/*.prompt.md` are not TypeScript. They are the literal system prompt text. The runtime reads them with `fs.readFile` at agent-definition initialization. Template variables (`{question}`, `{playbook}`, etc.) are interpolated by the context-bundle assembler (Ch.3 runtime) at invocation time.

---

*Cites: ADR-0004 (Ch.3), `docs/architecture/prompts.md`, `docs/architecture/runtime.md`, `docs/research/R0-knowledge-inventory.md` §2-3, `docs/research/R0-skill-inventory.md` §russell-voice §class-brand-voice §run-critique, `docs/research/phase-r-decisions.md` §Decision 2, BLOCKERS B3 B10 B19 B20, ROADMAP §Ch.4, `business-planning/Strategic_AI_Invocation_Guide.md` lines 291-330, `business-planning/turnaround_operating_library.md` §Section 3 + §Section 7, `tests/fixtures/canary-memo.md`, `tests/fixtures/rigor-cases.json`.*

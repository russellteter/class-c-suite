# O3 Brief — Schema-align + honest the generic six-lens prompts

## Mission
Rewrite the prompt files for the 6 strategic lenses (CEO/CFO/CRO/CMO/CPO/COS) and the
Synthesizer so that a live Claude model following them emits a JSON object that **passes the
exact zod `outputSchema`** the runtime validates against — and **never fabricates numbers or
named entities** under empty grounding. These prompts are currently never loaded (the agent
definitions carry `systemPrompt: 'STUB — see Ch.4'`); the wiring is done separately. Your job
is the prompt CONTENT.

This is U1-class work: the bar is a prompt whose declared output contract is byte-aligned to
its zod schema, and whose instructions are honest. The proof is a live run where
`dispatchLens` validates each lens output and does NOT throw.

## Runtime facts you MUST design to (all verified in the code, not guesses)

1. **`systemPrompt` is your `.md` file content passed VERBATIM to the model. There is NO
   placeholder substitution.** `apps/utility/src/agents/realClaudeClient.ts:176` passes
   `systemPrompt: definition.systemPrompt` as-is. Any `{question}` / `{vault.positions}` /
   `{date}` text in the current prompts is seen by the model as LITERAL characters `{question}`.
   → DELETE all `{...}` template placeholders. Describe the input as a JSON object instead.

2. **The model receives the context as the USER MESSAGE = `JSON.stringify(context)`**
   (`realClaudeClient.ts:174` `prompt: JSON.stringify(context)`).
   - For the 6 lenses the context object is: `{ runId, role, question, playbook, contextDocuments: [] }`.
     `contextDocuments` is an array of `{ id, title, content, source? }`. **It is CURRENTLY
     EMPTY (`[]`)** — no vault data, no financials, no memory, no doctrine are wired in yet
     (that is a separate future unit; do not assume any are present).
   - For the Synthesizer the context object is: `{ runId, question, playbook, lensOutputs }`
     where `lensOutputs` is a record keyed by role (`"CEO"`, `"CFO"`, …) whose values are the
     lens output objects (the base-lens schema below).

3. **`onSubagentStop` validates the model's raw JSON output against the registry
   `outputSchema` and THROWS `AgentOutputSchemaViolation` on any mismatch**
   (`apps/utility/src/orchestrator/hooks.ts:165`). A schema miss fails the live run loud.
   There is no coercion and no retry. Your prompt must make the model emit the exact shape.

4. **The runtime injects `role` + `runId` into the output before validation.** The wiring
   step merges `{ ...modelOutput, role, runId }` before `onSubagentStop`. So your emitted JSON
   does NOT need to include `role` or `runId` — emit only the content fields. (Including them
   is harmless, but never instruct the model to echo a `runId` UUID.)

5. **No tools are available.** Every lens has `toolAllowlist: []`. The lens CANNOT run a tool
   call. So the old instruction "cite a `source_id` from a tool call" is impossible to satisfy
   right now. See the honesty rule — citations come only from `contextDocuments` when present,
   otherwise the claim is UNKNOWN.

## DOCTRINE #1 — honesty under empty grounding (NON-NEGOTIABLE)

With `contextDocuments: []` and no tools, a lens has NO sourced facts. It MUST NOT invent
numbers or named entities.

- **Strip every hardcoded Class financial from the prompt frames.** The current `ceo.prompt.md`
  frame hardcodes "ARR is falling from $35.85M to $20.57M", "W30 cash trough on July 26, 2026
  sits at $111,766", "$25M Barclays Term + $5M Revolver + $1.4M PIK". The CFO/CRO frames likely
  do the same. A live model will regurgitate these as claims with no source → fabrication under
  a citation requirement → the exact DOCTRINE-#1 bug this project just fixed for cash_lever and
  board_narrative. DELETE the specific numbers.
- **Keep the QUALITATIVE frame.** "Class is a SaaS company in turnaround", the lens's analytical
  focus (CEO = board narrative / strategic optionality / covenant management; CFO = runway /
  unit economics; CRO = pipeline / retention; CMO = demand / positioning; CPO = product bets /
  roadmap; COS = execution / cross-functional risk) — that framing is legitimate standing
  context and should stay. It is not a citeable factual claim.
- **Any quantitative or named-entity claim with no backing in `contextDocuments` must be written
  as `"UNKNOWN — needs <NetSuite|vault|Chorus|Salesforce> query"`** and the lens proceeds. This
  mirrors the strategic-option/cash_lever honest-UNKNOWN treatment already in the codebase.
- A live run that emits a fabricated frame number as a claim is a FAILURE, even if the JSON is
  schema-valid. The adversarial grader will reject any prompt that invites fabrication.

## Fold-don't-drop rule

The current prompts have rich `risks` / `tripwires_observed` / `needs_from_other_lenses` /
`open_questions` sections. The thin schema has NO fields for them. Do NOT simply delete that
reasoning. FOLD it into the two fields the schema does have:
- `summary` — narrative prose; this is where the lens's position, top risks, and what it needs
  from other lenses live as readable text.
- `positions[]` — the discrete, individually-citeable claims.

The Synthesizer only ever sees `summary` + `positions` + `citations` (its input is an array of
the base-lens schema). That prose is the ONLY channel by which a lens's risk analysis reaches
the memo. Strip the structured sections, preserve their content in `summary`/`positions`.

## EXACT schemas — the source of truth (from packages/shared-types + agents/index.ts)

```ts
CitationSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.string(),
  page: z.number().int().optional(),
});

PositionSchema = z.object({
  positionId: z.string(),
  claim: z.string(),
  isQuantitative: z.boolean().optional(),
  citations: z.array(CitationSchema),
  sourceText: z.string(),
});

QuantitativeAssertionSchema = z.object({
  claim: z.string(),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  sourceText: z.string().optional(),
});

// CEO/CRO/CMO/CPO/COS output (role is injected; see runtime fact #4)
BaseLensOutputSchema = z.object({
  role: AgentRoleSchema,            // injected by runtime
  runId: z.string(),                // injected by runtime
  summary: z.string().min(1),
  positions: z.array(PositionSchema),
  citations: z.array(CitationSchema),
  confidence: z.number().min(0).max(1),   // FLOAT 0..1, not 0..100
});

// CFO output
CFOOutputSchema = BaseLensOutputSchema.extend({
  role: z.literal('CFO'),
  quantitativeAssertions: z.array(QuantitativeAssertionSchema),
});

// Synthesizer output (STRICT — every min() constraint is enforced)
SynthesizerProposedWritebackSchema = z.object({
  artifactType: z.enum(['position','decision','prediction','pre-mortem-update','stakeholder-update','workstream-advance']),
  targetArtifactId: z.string().nullable(),     // null = create new
  proposedFrontmatterPatch: z.record(z.string(), z.unknown()),
  proposedBodyPatch: z.string(),
  lensesContributing: z.array(AgentRoleSchema),
  oneSentenceDescription: z.string(),
});
SynthesizerOutputSchema = z.object({
  role: z.literal('Synthesizer'),   // injected by runtime
  runId: z.string(),                // injected by runtime
  memoMarkdown: z.string().min(100),
  executiveSummary: z.string().min(50),
  keyDecisions: z.array(z.string()).min(1),
  citations: z.array(CitationSchema).min(1),
  positionMetadata: z.array(z.object({
    positionId: z.string(),
    role: AgentRoleSchema,
    claim: z.string(),
    isQuantitative: z.boolean(),
    namedEntity: z.string().optional(),
    citations: z.array(CitationSchema),
    sourceText: z.string(),
  })),
  proposedWritebacks: z.array(SynthesizerProposedWritebackSchema).default([]),
});
```

## Canonical OUTPUT block — 5 base lenses (CEO/CRO/CMO/CPO/COS)

Put this (adapted to prose, not necessarily verbatim) as the prompt's OUTPUT section. The model
must emit exactly one JSON object of this shape:

```json
{
  "summary": "<one or more paragraphs: this lens's reconciled position, its top risks, and what it needs from the other lenses — folded into prose>",
  "positions": [
    {
      "positionId": "<role>-p1",
      "claim": "<a discrete claim this lens makes>",
      "isQuantitative": false,
      "citations": [{ "id": "c1", "text": "<supporting quote/fact>", "source": "<contextDocument id, or 'UNKNOWN — needs <source>'>" }],
      "sourceText": "<the text this claim rests on, or 'UNKNOWN — needs <source>'>"
    }
  ],
  "citations": [{ "id": "c1", "text": "<...>", "source": "<...>" }],
  "confidence": 0.6
}
```

Field rules:
- `confidence` is a float in `[0,1]`. NOT a percentage. A lens with no grounding should report
  LOW confidence (e.g. 0.2–0.4) and say so in `summary`.
- `positions[]` may be empty `[]` only if the lens genuinely has nothing to assert; prefer 1–4
  positions, each with `positionId` like `"CEO-p1"`.
- Every `citations[]` entry needs `id`, `text`, `source`. When there is no real source, set
  `source` to `"UNKNOWN — needs <NetSuite|vault|...>"` and keep the claim honest in `text`.
- Do NOT emit `risks`, `evidence`, `position` (singular), `tripwires_observed`,
  `needs_from_other_lenses`, `open_questions`, or `degraded_sources` as TOP-LEVEL fields — they
  are not in the schema and would be dropped or (if strict) rejected. Fold them into `summary`.

## Canonical OUTPUT block — CFO (adds quantitativeAssertions)

Same as base, plus a required `quantitativeAssertions` array:
```json
{
  "summary": "...", "positions": [...], "citations": [...], "confidence": 0.3,
  "quantitativeAssertions": [
    { "claim": "Current runway", "value": "UNKNOWN — needs NetSuite query", "unit": "months", "sourceText": "no financial source in context" }
  ]
}
```
CFO is the lens MOST likely to fabricate. Be ruthless: every `value` with no source in
`contextDocuments` is the string `"UNKNOWN — needs <source>"`, never an invented number.
`value` accepts a number OR a string, so UNKNOWN-as-string is schema-valid.

## Canonical OUTPUT block — Synthesizer (STRICT object — NOT a markdown document)

The current Synthesizer prompt says "Produce a single markdown document." That is WRONG — it
must emit the strict JSON object below, with the full memo markdown living INSIDE the
`memoMarkdown` field:

```json
{
  "memoMarkdown": "# <title>\n\n## Executive Summary\n...\n## Reconciled Position\n...\n## Claims and Evidence\n...\n## Risks\n...\n## Proposed Write-Backs\n...\n## Open Questions\n...\n## Falsifiers\n- <what would flip the reco>",
  "executiveSummary": "<3-5 sentence plain-text exec summary, >= 50 chars>",
  "keyDecisions": ["<decision 1>", "<decision 2>"],
  "citations": [{ "id": "c1", "text": "<...>", "source": "<...>" }],
  "positionMetadata": [
    { "positionId": "CEO-p1", "role": "CEO", "claim": "<...>", "isQuantitative": false, "citations": [{"id":"c1","text":"...","source":"..."}], "sourceText": "<...>" }
  ],
  "proposedWritebacks": []
}
```
Field rules:
- `memoMarkdown` >= 100 chars and contains ALL the memo sections (Executive Summary, Reconciled
  Position, Claims and Evidence, Risks, Proposed Write-Backs, Open Questions, **Falsifiers**).
  The falsifiers section stays REQUIRED (it lives in the markdown body).
- `executiveSummary` >= 50 chars, plain text, separate from the markdown.
- `keyDecisions` >= 1 item. `citations` >= 1 item. `positionMetadata` derived from the lens
  positions it used. `proposedWritebacks` may be `[]`.
- Keep the existing russell-voice + class-brand-voice guidance — that content is good, leave it.
- The Synthesizer reasons ONLY from `lensOutputs` in its context; it does not re-run tools. If
  the lenses are mostly UNKNOWN (empty grounding), the memo must SAY so honestly and the
  exec summary should flag the missing grounding — do not paper over it with invented specifics.

## Per-agent task

For your assigned agent, read `apps/utility/src/prompts/<file>` (the current content), then
produce the FULL rewritten file content that:
1. Keeps the qualitative frame / analytical focus / voice rules (the good prose).
2. Strips every hardcoded specific number/entity → honest UNKNOWN where a claim needs a source.
3. Replaces the CONTEXT section: describe the JSON input object (fact #2), not `{placeholders}`.
4. Replaces the OUTPUT section with the canonical block for your role; the emitted JSON must
   pass the exact schema above.
5. Applies the fold-don't-drop rule.

Return the full new file content as a single string. Do not write the file — the orchestrator
applies it after an adversarial schema-conformance check.

## What the grader will check (so self-check against it)
A Sonnet model obeying your prompt, handed the JSON user-message, emits ONE JSON object that
`<RoleSchema>.safeParse()` accepts: all required fields present, correct types, `confidence` in
`[0,1]`, arrays well-formed, no extra top-level field that does not exist in the schema. AND no
fabricated number/entity without a source. A prompt that invites either failure is rejected.

## Proven-pattern reference (already in the repo, do the same quality)
- `apps/utility/src/playbooks/pre-mortem/index.ts` (U1): dedicated prompt loaded via
  `readFileSync`, output validated by a local zod schema, fail-loud on mismatch.
- `apps/utility/src/agents/verifier-runner.ts`: prompt loaded from `../prompts/Verifier.prompt.md`,
  output validated by `VerifierOutputSchema`. You are bringing the 6 lens + Synthesizer prompts
  to that same standard, against THEIR schemas.

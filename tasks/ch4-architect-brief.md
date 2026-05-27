# Ch.4 Architect — Prompts + Rigor Scoring + Verifier SPEC

## Your role

Architect for C-Suite Chapter 4 (verbatim 5 lens prompts + authored CPO + Synthesizer + Verifier + Red-Team + Steelman + Handoff + Run-Critic prompts; pure `rigorScore()` + `isQuantOrNamed()`; planted-claim canary). DOCTRINE law #7 — SPEC only.

This is the trust-defining chapter. The Verifier is the single most important prompt in the product (B3 P0). The keystone canary fixture is the permanent regression guard.

## Required reads

1. `ROADMAP.md` §Ch.4 (lines ~95-108) — exit criteria.
2. `docs/decisions/0004-ch3-runtime-spine.md` — Ch.3 ADR (12 AgentDefinitions + Verifier input contract). Your prompts go INTO those AgentDefinitions.
3. `docs/architecture/prompts.md` — lens skeleton + CPO authored prompt + Synthesizer + Verifier + Red-Team + Steelman + Handoff + Run-Critic + `rigorScore()` 12-case table + `isQuantOrNamed()` design + planted-claim canary.
4. `docs/research/R0-knowledge-inventory.md` §Verbatim lens prompts — extracted CEO/CFO/CRO/CMO/COS from `Strategic_AI_Invocation_Guide.md`. CRO requires committed-stage-label correction per B19.
5. `docs/research/R0-skill-inventory.md` §Verbatim Russell-voice rules (57) + §Verbatim Class-brand-voice rules (29) + §Run-Critic 5-dim rubric — drop-in for Synthesizer + RunCritic prompts.
6. `docs/research/phase-r-decisions.md` §Decision 2 — anti-sycophancy patterns; §Decision 4 — per-playbook precondition matrix.
7. `tests/fixtures/canary-memo.md` + `tests/fixtures/rigor-cases.json` — Ch.0 scaffold fixtures; your spec defines how they're consumed.
8. `BLOCKERS.md` B3 (Verifier reasoning-trace leak — VERIFIED keystone), B10 (`isQuantOrNamed` load-bearing 35% of rigor; deterministic).

## Deliverables

ONE ADR at `docs/decisions/0005-ch4-prompts-rigor.md`. Sections:

### Section 1 — Verbatim 5 lens prompts (CEO/CFO/CRO/CMO/COS)

Drop-in from `docs/research/R0-knowledge-inventory.md` §2 (Verbatim lens prompts). Citation: Invocation Guide line ranges per R0-Spine.

**Critical fix for CRO before Runtime drops it in:** R0-Spine §1 finding — CRO frame references `S4 + S5 + Commit + BestCase` stage labels (B19). Replace with the real labels: `Verbal Agreement, Verbal Approval, Contracting, Quote in Review, Negotiation` (new-biz committed) + `Renewal Quote Sent, Qualified Renewal` (renewal committed).

Each prompt lands at `apps/utility/src/prompts/<role>.prompt.md`.

### Section 2 — Authored CPO prompt

Per `docs/architecture/prompts.md` §CPO lens. Drop in the verbatim authored prompt, grounded in `turnaround_operating_library.md` §SaaS Turnaround Patterns + §AI-Native Operations (R0-Spine extracted these).

### Section 3 — Synthesizer prompt + brand-voice bake

Per `docs/architecture/prompts.md` §Synthesizer. Append two VOICE RULES sections inline (verbatim from R0-Skills §Russell-voice rules + §Class-brand-voice rules — 57 + 29 rules respectively). Synthesizer reads context → decides personal-facing vs company-facing → applies the right rule set.

### Section 4 — Verifier prompt (THE keystone)

Per `docs/architecture/prompts.md` §Verifier + Phase R decision #2. The 5 anti-sycophancy patterns:

1. Structural isolation from lens reasoning traces (enforced by `VerifierInputContractViolation` in Ch.3 ADR §5).
2. Forced JSON output schema with mandatory falsifiers + missing-data flags.
3. Higher-reasoning model than lenses (Opus 4.7 default per Ch.3).
4. Schema-rejection of null returns on required fields.
5. Planted-claim canary on every CI (§5 below).

Specify the prompt's literal text + the Zod schema for the output. Critical anti-sycophancy disciplines:
- Empty falsifier rejection.
- Missing-data flag rejection.
- Forced JSON output.
- No lens reasoning visibility.

### Section 5 — Planted-claim canary fixture

Per `docs/architecture/prompts.md` §Planted-claim canary + R2 §B3 (this is the permanent regression guard).

- Fixture: `tests/fixtures/canary-memo.md` (already in repo from Ch.0 scaffold).
- Test: `tests/unit/verifier-canary.spec.ts` runs Verifier on the canary; MUST mark the planted-unsourced-quantitative claim as `claims_unverified`; MUST return `ship_status: 'draft'`.
- Runs on every CI build. Goes RED if any future model update makes the Verifier lenient.

### Section 6 — `rigorScore()` pure function

Per `docs/architecture/prompts.md` §rigorScore. Pure function:
- 35 claim_source + 20 coverage + 15 red_team + 15 calibration + 15 falsifier.
- Clean ≥70. Strategic/Restructure ≥80. Open Q&A capped at 85.
- Implementation: `apps/utility/src/scoring/rigorScore.ts`.
- Test: 12-case locked test table (Ch.0 scaffolded `tests/fixtures/rigor-cases.json` — verify the JSON matches the 12 rows in `prompts.md`).

### Section 7 — `isQuantOrNamed()` classifier (B10)

Per `docs/architecture/prompts.md` §isQuantOrNamed + R2 §B3 5 edge cases.

Deterministic — no LLM. 50+ test cases including R2's 5 edge cases:
1. Date in opinion claim ("by next quarter") → false.
2. Named entity in hypothetical ("if Barclays were to call") → true (per NAMED_ENTITY_REGISTRY).
3. Number in metaphor ("a thousand cuts") → false.
4. Percentage in projection ("ARR might grow 15% if renewals hold") → true.
5. Currency abbreviation without digits ("$M range") → false.

Implementation: `apps/utility/src/scoring/isQuantOrNamed.ts`.

### Section 8 — NAMED_ENTITY_REGISTRY pre-load (B3 R2)

Specify:
- Build the registry from `vault/stakeholders/*` (R0-Vault listed: 13 stakeholders) + `turnaround_operating_library.md` + competitor list (`vault/adversarial/competitor-watch/`).
- Load at utility-process startup. Cache in-memory.
- Re-load on chokidar `vault.changed` event when a stakeholder file changes.
- Module: `apps/utility/src/registry/namedEntities.ts`.

### Section 9 — Red-Team + Steelman + Handoff + Run-Critic prompts

Per `docs/architecture/prompts.md` §Red-Team + §Steelman + §Handoff + §Run-Critic. Drop the Run-Critic 5-dimension rubric verbatim from R0-Skills.

### Section 10 — Acceptance criteria (8-10 rows)

Map ROADMAP §Ch.4 exit criteria to tests:
- Planted-claim canary PASS (Verifier flags it; ship_status='draft').
- 12-case `rigorScore()` table reproduces exactly.
- `isQuantOrNamed()` 50+ cases pass (5 R2 edge cases included).
- NAMED_ENTITY_REGISTRY loads at startup + reloads on stakeholder change.
- All 12 prompts conform to their AgentDefinition outputSchema (parse seed fixtures).

### Section 11 — Considered alternatives + UNKNOWN

What you considered + rejected. UNKNOWN items (e.g., specific edge cases the registry doesn't cover yet).

## Discipline

- SPEC only. No production code.
- Cite source files (Invocation Guide, turnaround library, R0 reports) + line ranges.
- The Verifier prompt is the keystone — get it right or surface the gap.
- Resilience: write scaffold early.
- After writing ADR-0005, return structured summary <500 words: ADR path, Verifier prompt highlights, rigorScore signature + 12-case table summary, NAMED_ENTITY_REGISTRY load source list, UNKNOWN items.
- Sonnet OK (Opus 529s yesterday); Architect role normally Opus but the spec is well-defined by `prompts.md` so Sonnet is acceptable.

## Out of scope

- Production code (Runtime + Test dispatches).
- UI (Ch.5).
- Lens isolation enforcement (Ch.3 ADR §4).
- Verifier input contract assembly (Ch.3 ADR §5 — you write the prompt; Ch.3 owns the assembler).

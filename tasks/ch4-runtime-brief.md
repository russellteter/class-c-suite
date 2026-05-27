# Ch.4 Runtime — Implementation Brief (Prompts + rigor scoring + Verifier)

## Your role

Runtime engineer for Ch.4. Implements against `docs/decisions/0005-ch4-prompts-rigor.md`. Activates the TDD-RED tests from `tests/unit/{rigor-score-table,is-quant-or-named,verifier-canary,named-entity-registry,lens-prompts,synthesizer-voice-bake,handoff-runcritic-prompts}.spec.ts`. DOCTRINE law #7 — don't write tests.

## Required reads

1. `docs/decisions/0005-ch4-prompts-rigor.md` — your spec.
2. `docs/research/R0-knowledge-inventory.md` §2 — verbatim 5 lens prompts (CEO/CFO/CRO/CMO/COS). Use byte-for-byte. **For CRO: apply B19 stage-label correction (Verbal Agreement, Verbal Approval, Contracting, Quote in Review, Negotiation; +renewal Renewal Quote Sent, Qualified Renewal).**
3. `docs/research/R0-skill-inventory.md` §verbatim russell-voice rules (57) + §verbatim class-brand-voice rules (29) + §Run-Critic 5-dim rubric.
4. `tests/fixtures/canary-memo.md` (Ch.0 scaffold) + `tests/fixtures/rigor-cases.json` (Ch.0 scaffold).
5. The 7 Ch.4 TDD-RED tests.

## Deliverables (per ADR-0005 sections)

### Section 1 — Verbatim 5 lens prompts

`apps/utility/src/prompts/{CEO,CFO,CRO,CMO,COS}.prompt.md`:
- Drop in verbatim from R0-Spine §2.
- CRO must use corrected stage labels (test verifies).

### Section 2 — Authored CPO prompt

`apps/utility/src/prompts/CPO.prompt.md`:
- Drop in the authored CPO prompt from `docs/architecture/prompts.md` §CPO lens.

### Section 3 — Synthesizer prompt + brand-voice bake

`apps/utility/src/prompts/Synthesizer.prompt.md`:
- Per `docs/architecture/prompts.md` §Synthesizer.
- Append **two** verbatim VOICE RULES sections:
  - `## VOICE RULES — russell-voice` (57 rules from R0-Skills)
  - `## VOICE RULES — class-brand-voice` (29 rules)
- Include routing logic in the prompt: personal-facing → russell; company-facing → class.

### Section 4 — Verifier prompt (keystone)

`apps/utility/src/prompts/Verifier.prompt.md`:
- The 5 anti-sycophancy patterns per ADR §4 + Phase R Decision 2.
- Forced JSON output schema (Zod-validated).
- Structurally blind to lens reasoning traces.
- Empty falsifier rejection.
- Missing-data flag rejection.

### Section 5 — Canary fixture + test wire

`tests/unit/verifier-canary.spec.ts` is already shipped (Ch.3 Test + Ch.4 Test). Ch.4 Runtime wires:
- The Verifier prompt loads correctly.
- The canary memo + structured-output stub matches Ch.3's `buildVerifierInput()` interface.
- A recorded stub at `tests/fixtures/lens-outputs/canary-run/Verifier.json` simulates a hypothetical Opus call where the Verifier correctly flags the planted unsourced "$43M" claim.

### Section 6 — `rigorScore()` pure function

`apps/utility/src/scoring/rigorScore.ts`:
- `rigorScore(verifierOutput): number` — pure, no side effects.
- `rigorThreshold(playbook): number` — 80 for strategic_option/restructure; 85 for open_qa; 70 default.
- `applyRigorCap(score, playbook): number` — clamps open_qa to 85.
- `shipStatus(score, playbook): 'clean' | 'draft' | 'quick_read'`.
- 12-case test table must pass.

### Section 7 — `isQuantOrNamed()` deterministic classifier

`apps/utility/src/scoring/isQuantOrNamed.ts`:
- Deterministic — no LLM. Regex + named-entity registry.
- Per ADR §7 + R2 5 edge cases.
- 50+ test cases must pass.

### Section 8 — NAMED_ENTITY_REGISTRY

`apps/utility/src/registry/namedEntities.ts`:
- `loadNamedEntityRegistry(vaultPath)` — load from stakeholders + competitor-watch + bootstrap fallback.
- Re-load on chokidar `vault.changed` for stakeholder files.
- Bootstrap entities per ADR §8 (Barclays, Holdco, Class, Zoom, NetSuite, etc.).

### Section 9 — Red-Team + Steelman + Handoff + Run-Critic prompts

`apps/utility/src/prompts/{RedTeam,Steelman,Handoff,RunCritic}.prompt.md`:
- Per `docs/architecture/prompts.md` §each section.
- Handoff: include brand-skill recommendations (class-brand-document, class-brand-excel, class-brand-presentations).
- RunCritic: include verbatim 5-dimension rubric from R0-Skills.

## Commit discipline

Atomic per section:
1. `ch4: verbatim 5 lens prompts + CRO stage-label fix (B19) (ADR §1)`
2. `ch4: authored CPO prompt (ADR §2)`
3. `ch4: Synthesizer prompt + russell-voice + class-brand-voice rules (ADR §3)`
4. `ch4: Verifier prompt — 5 anti-sycophancy patterns (B3 keystone) (ADR §4)`
5. `ch4: canary fixture + verifier stub (ADR §5)`
6. `ch4: rigorScore() + threshold + cap (12-case table) (ADR §6)`
7. `ch4: isQuantOrNamed() deterministic classifier + 50+ cases (ADR §7)`
8. `ch4: NAMED_ENTITY_REGISTRY load + reload-on-vault-change (ADR §8)`
9. `ch4: Red-Team + Steelman + Handoff + Run-Critic prompts (ADR §9)`

Each auto-pushes.

## Verify before claiming done

- `pnpm -r run typecheck` PASS.
- `pnpm run test:unit` — all 706+ green + all 7 Ch.4 TDD-RED files now green.

## Return

Under 500 words: files created (paths), commit SHAs (last 10), spec ambiguity resolved (esp U-1 CRO stage labels, U-2 verifier canary stub, U-3 stakeholder canonical names), `tail -5 .git/auto-push.log`.

## Out of scope

- 12 AgentDefinitions (Ch.3 Runtime ships skeletons; Ch.4 fills in prompt content).
- Lens isolation enforcement (Ch.3).
- Verifier input contract assembler (Ch.3).
- UI screens (Ch.5).

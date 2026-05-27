# Ch.4 Audit/QA — Independent Acceptance Verification

## Your role

Independent Audit/QA for Ch.4 (prompts + rigor scoring + Verifier). DOCTRINE law #7. Default NEEDS WORK.

The Ch.4 keystone is the Verifier (B3 P0). The planted-claim canary is the permanent regression guard.

## Required reads

1. `docs/decisions/0005-ch4-prompts-rigor.md` — SPEC + §10 acceptance criteria.
2. `BLOCKERS.md` B3 (Verifier reasoning-trace leak), B10 (isQuantOrNamed load-bearing for 35% of rigor).
3. Production: `apps/utility/src/prompts/{CEO,CFO,CRO,CMO,CPO,COS,Synthesizer,Verifier,RedTeam,Steelman,Handoff,RunCritic}.prompt.md` + `apps/utility/src/scoring/{rigorScore,isQuantOrNamed}.ts` + `apps/utility/src/registry/namedEntities.ts`.
4. Tests: `tests/unit/{rigor-score-table, is-quant-or-named, verifier-canary, named-entity-registry, lens-prompts, synthesizer-voice-bake, handoff-runcritic-prompts}.spec.ts`.
5. `tests/fixtures/{canary-memo.md, rigor-cases.json, lens-outputs/canary-run/Verifier.json}`.

## Protocol

- 12-case `rigorScore()` table reproduces exactly (`tests/fixtures/rigor-cases.json` matches ADR §6.2 verbatim).
- CRO prompt has corrected stage labels (verify NO `'S4'`, `'S5'`, or `'BestCase'`; verify presence of `'Verbal Agreement'`).
- Verifier prompt has all 5 anti-sycophancy patterns + forced JSON schema + no reasoning-trace visibility.
- Synthesizer prompt has both VOICE RULES sections (russell-voice + class-brand-voice).
- isQuantOrNamed deterministic — same input → same output across runs.
- NAMED_ENTITY_REGISTRY loads from stakeholders + competitor-watch + bootstrap entities.
- Reproduce ≥1 BY HAND. Recommended: load Verifier.json canary stub, manually verify it has `ship_status: 'draft'` + `$43M` in `claims_unverified` + `claim_source.score < 35`.

## Deliverables

1. `docs/reviews/ch4-audit-qa-report.md`.
2. `BLOCKERS.md` B3 + B10 status update.
3. `docs/build-log.md` Ch.4 close entry.
4. `.claude/project-state.json` → `ch-4-complete-ready-for-ch5`.

Commit atomically.

## Return

Under 500 words: verdict counts, CLOSE/REOPEN, top findings, BLOCKERS deltas, commit SHAs, `tail -5 .git/auto-push.log`.

# Ch.0 Architect — SPEC Brief

## Your role

You are the Architect for C-Suite Chapter 0 (Foundations). You operate under the C-Suite build doctrine in `/Users/russellteter/Claude Code Projects/c-suite/DOCTRINE.md` — 10 non-negotiable laws. Truth over completion appearance; cite everything; UNKNOWN over fabrication. You write SPEC + ADR only — no production code (Runtime/Test dispatches own implementation).

## Required reads (cite each with file path + heading + line range)

1. `ROADMAP.md` §Ch.0 (lines ~41-53) — chapter exit criteria.
2. `docs/architecture/delivery.md` — per-chapter ritual + repo tree (you will adjust the tree).
3. `docs/architecture/runtime.md` — process architecture (you specify the package layout that supports it).
4. `docs/architecture/data.md` — current Zod schemas (you replace per below).
5. `docs/research/R0-constraints-ledger.md` — **the keystone read.** §2 (per-artifact schema reality) and §3 (SD-01 through SD-07 with TypeScript snippets). These are the corrected schema shapes you must spec.
6. `docs/research/R0-skill-inventory.md` — for installer reference (B29 root cause is in §Top Findings).
7. `docs/research/R2-feasibility-notes.md` §Area 8 — installer regex bug root cause + state-machine fix shape.
8. `docs/research/phase-r-decisions.md` §10 decisions — only items relevant to Ch.0 are #2 (Verifier anti-sycophancy patterns — informs eventual prompt schema) and #9 (PowerBI subprocess option (b) — informs eventual Ch.8 spec but ALSO informs Ch.0 preflight requirements for Python+venv).
9. `BLOCKERS.md` — focus on B21, B22, B23, B24, B26, B27, B29 (Ch.0-owned) + B3, B30 (Ch.0 has read responsibility, not implementation).
10. `docs/build-log.md` §2026-05-26 — Phase R complete §"Architecture-spec patches OWED to Ch.0 architect" — your authoritative scope. Items 1, 18, 19, 20 are Ch.0; items 2-17 belong to later chapters.

## Deliverables

Produce ONE atomic ADR at `docs/decisions/0001-ch0-foundations.md` using the `docs/decisions/ADR-template.md` format. It must contain:

### Section 1 — Repo skeleton (TypeScript monorepo)

Specify the directory tree concretely. Pin tool versions:
- pnpm workspace (pin pnpm major version)
- TypeScript (pin major version — current modern default in 2026)
- Electron (pin major version per R2-confirmed `utilityProcess.fork()` support)
- electron-builder (pin major version; sign/notarize config deferred to Ch.11 but config file shape decided now)
- vitest + Playwright (test layers)
- Zod (pin major; verify peer-deps with React)
- React + Tailwind (renderer; pin major versions)
- better-sqlite3 (with electron-rebuild pinning note per BLOCKERS B14)

Adjust `docs/architecture/delivery.md` §repo tree if your skeleton diverges from the scaffold.

**Use `context7` to verify current versions where uncertainty exists. UNKNOWN where unresolvable in 3 lookups.**

### Section 2 — Corrected Zod schema set (the keystone — item 1 of OWED list)

Replace every schema in `docs/architecture/data.md` with the byte-for-byte-correct shapes from `docs/research/R0-constraints-ledger.md` §3 (SD-01 through SD-07). Critical changes:

- **SD-01 (B21).** Drop `type: z.literal(...)` from every schema. Provide `parseArtifact(rawYaml, zone)` wrapper that injects `type` from file-path zone at parse time. Place in `packages/shared-types/src/parseArtifact.ts`.
- **SD-02 (B23).** Add `normalizeKeys()` middleware (replace `-` with `_` on object keys) in `packages/shared-types/src/normalizeKeys.ts`. Wire into `parseArtifact()` BEFORE Zod.parse().
- **SD-03 (B24).** Expand `WorkstreamFrontmatter` to the 15-field shape with nested `cash_impact`/`arr_impact`/`status_criteria` objects.
- **SD-04 (B27).** Split `StakeholderFrontmatter` into `z.union([StakeholderPersonFrontmatter, StakeholderAccountFrontmatter])`. Discriminate by presence of `account_id`.
- **SD-05 (B26).** Replace `PreMortemFrontmatter.impact` enum with `['existential', 'high', 'HIGH', 'medium']`. Probability `z.union([z.number().int(), z.string().regex(/^\d+%$/)])`.
- **SD-06.** Rename `decided_on` → `date_proposed` in `DecisionFrontmatter`; reversibility free-text; status enum `['proposed', 'in-execution', 'resolved-correct', 'deferred']`.
- **SD-07.** `PredictionFrontmatter` reality-fit (resolution_date not resolves_by; spawned_by; PRED-007 variant fields optional).

Provide complete TypeScript snippets ready to drop into `packages/shared-types/src/vault-schemas.ts`.

### Section 3 — IPC discriminated union (typed cross-process contract)

Codify the IpcMessage discriminated union per `docs/architecture/runtime.md` §IPC + `docs/architecture/data.md` §IPC type definitions. Place in `packages/shared-types/src/ipc.ts`. Include the Zod validator + TypeScript type export.

### Section 4 — CI configuration

GitHub Actions YAML (in `.github/workflows/ci.yml`): typecheck + lint + unit tests + integration tests (stub-harness). **Zero live inference.** Runs on `ubuntu-latest` (delivery.md §CI). E2E + sign/notarize run locally on Ch.11. Specify the cache strategy + node version.

### Section 5 — Stub-harness skeleton

Specify `packages/stub-harness/src/stub.ts` per `docs/architecture/delivery.md` §stub-model harness. `StubMode = 'live' | 'record' | 'replay'`. `STUB_MODE=replay` is the CI default. Fixtures loaded from `tests/fixtures/`.

### Section 6 — Preflight extensions (item 18 of OWED list — B33 + B29 cross-reference)

Spec the additions to `scripts/preflight.sh`:
- Dropbox / Google Drive sync detection on the vault path (not just iCloud). Detection methods documented in R2 §Area 4 (`.dropbox` marker file, Google Drive process name, `com.google.drivefs` kernel extension).
- Skill body line-count check: for each of the 8 op-logic skills, verify `wc -l ~/.claude/skills/<n>/SKILL.md >= 50` (flag if truncated per B29).

### Section 7 — Installer fix (item 19 of OWED list — B29)

Spec the `scripts/install-extracted-skills.py` state-machine parser rewrite per R2 §Area 8 root-cause analysis. NOT a regex tweak — a state machine that tracks open/closed code fences.

**Regression test specification** (per advisor — Test dispatch will write this verbatim from your ADR):

```
For each of the 8 op-logic skills in business-planning/skills/<name>/SKILL.md:
1. Run `python3 scripts/install-extracted-skills.py`.
2. Read installed `~/.claude/skills/<name>/SKILL.md` byte count A.
3. Read full-body `business-planning/skills/<name>/SKILL.md` byte count B.
4. Assert |A - B| / B < 0.05 (within 5%).
5. Read both files' content; assert `diff(installed, full_body)` returns no semantic content differences (whitespace/install-metadata-header tolerated).
Test fails if any skill installs at <95% the full-body size.
```

### Section 8 — Vault bootstrap script (item 20 of OWED list — B22)

Spec `scripts/vault-bootstrap.sh`:
- Write `<vault>/.gitignore` with `.DS_Store`, `*.tmp-*`, `*.proposed-*`, `_extracted_skills_for_c_suite.md`, `**/.obsidian/workspace.json`.
- Run `git -C <vault> add . && git -C <vault> commit -m "vault: pre-C-Suite SafeWrite baseline"`.
- Idempotent: skip the commit if `git log --oneline -1` already returns a commit.
- Print summary: total files staged, total size, commit SHA.

### Section 9 — Acceptance criteria checklist

Map each ROADMAP §Ch.0 exit criterion to a testable + observable proof. Format as `| Criterion | Test/Observation | Owner |`. Audit/QA will re-derive PASS/FAIL from this checklist.

### Section 10 — Considered alternatives

Per ADR template — what you considered and rejected for each major decision (tool versions, schema design, installer fix approach).

### Section 11 — DOCTRINE amendment proposal (surfaced, not applied)

In a clearly-labeled "Proposed for Russell ratification" section, surface the proposed DOCTRINE law #1 amendment from `docs/build-log.md` §2026-05-26 — Phase R complete §Doctrine amendments proposed: "Every architecture-spec claim about external reality must carry `[<source> verified <date>]` tag or `🔍 VERIFY` marker." Auto-mode does NOT apply doctrine amendments per DOCTRINE §Amendment process.

## Discipline

- SPEC only. No production code. The Runtime + Test dispatches own the implementation.
- Every external-reality claim (library version, API signature) cites `context7` lookup or web docs URL.
- UNKNOWN over fabrication (DOCTRINE law #1).
- You write the ADR file yourself (DOCTRINE law #7 — writer ≠ grader).
- After writing, return structured summary (under 500 words): ADR path, key contract diffs (top 10 lines of vault-schemas.ts), acceptance criteria checklist (the table), and any UNKNOWN items the orchestrator must surface.
- Opus 4.7 — architecture-across-many-files justifies Opus per cost discipline.

## Out of scope

- Items 2-17 of the build-log OWED list — those belong to Ch.1-11 chapter Architects. Trust the per-chapter ritual to surface them when those chapters open.
- Production code (Runtime/Test dispatches).
- UI mockups (Ch.0 has no UI screens — Ch.5 is the first UI chapter).
- Vault writes (DOCTRINE law #10 — don't touch Russell's vault from this dispatch).

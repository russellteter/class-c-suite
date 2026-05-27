# R0-Vault — Artifact Directory Schema Reality

## Your role

You are R0-Vault, one of four parallel R0 sub-agents in Phase R of the C-Suite build. You operate under the C-Suite build doctrine (10 laws in `DOCTRINE.md`).

## Mission

Read every artifact directory in the vault. Document the **actual on-disk frontmatter schema** for each artifact type — not the design-doc-claimed schema, the real one. The Ch.0 Zod schemas (`docs/architecture/data.md`) must match byte-for-byte. Produce `docs/research/R0-constraints-ledger.md`.

## Vault path

`/Users/russellteter/Documents/Claude/Projects/Business Planning/` (verified non-iCloud-synced per preflight).

Mirror present at `/Users/russellteter/Claude Code Projects/c-suite/business-planning/` — prefer reading the source-of-truth vault; flag any drift in your "mirror-divergence" finding section.

## Required reads (every directory, every file's frontmatter; no skipping)

For each directory below:
- List total file count.
- Sample at least 3 files (or all if ≤5). Read frontmatter (YAML between `---` markers). Document actual keys present + their value types.
- Note any orphans (files without frontmatter; files referenced by INDEX but missing).
- Note any freshness signals (oldest + newest `last_retested` or modification dates).

1. `positions/` — every active position. Verify `correction-log[]` schema; supersession chain pattern; actual frontmatter keys vs PRD §6 / data.md PositionFrontmatter.
2. `decisions/` — active + resolved. Verify snake_case vs camelCase fields, tripwire schema, link conventions.
3. `workstreams/` — all 12 turnaround tracks. Verify `amount_usd` shape (BLOCKERS B12 says free-text — confirm distribution: "$1.2M", "approx $500K", "TBD"). Dependency model. Status lifecycle.
4. `stakeholders/` — all 13 models. Verify lean frontmatter claim from ultraplan — what's actually populated vs what data.md StakeholderFrontmatter requires.
5. `pre-mortems/` — all 13 entries. Verify probability/impact/early-warning/mitigation schema.
6. `calibration/` — `SCORECARD.md` plus per-prediction files. Brier-score-equivalent shape.
7. `adversarial/` — competitor watch, financial tripwires, regulatory exposure, defection patterns.
8. `investigations/` — both completed `/deep` runs (`class-org-institutional-read`, `class-gtm-strategy-2026`) — read INDEX + a memo-quality sample. These show "what good output looks like" for Ch.5 acceptance.
9. `deliverables/` — past run outputs including `.xlsx`/`.csv`/`.html` artifacts (list type distribution; do NOT parse binaries).
10. `memos/` (if present) — existing memo files. Note frontmatter format if any.

## Also verify (B9 + B12)

- **Vault git status:** is the vault initialized as a git repo? Run `git log --oneline -5` in vault path. Document state. If NOT initialized, flag as a Ch.2 prerequisite.
- **iCloud sync:** preflight says non-iCloud. Re-verify: run `xattr -p com.apple.fileprovider.fpfs#P "<vault>"` — should report no such attribute. Cite the actual command output.
- **`amount_usd` parser feasibility (B12):** sample 12 workstream `amount_usd` values. Categorize: parseable as cents-integer / ambiguous / TBD. The Ch.1 SQLite mirror parser needs to know this distribution.

## Deliverable

Write `docs/research/R0-constraints-ledger.md` with these sections:

1. **Per-directory inventory** — table: directory, file count, schema variants observed, oldest/newest mtime, orphan count.
2. **Frontmatter schemas — byte-for-byte** — for each artifact type, the actual Zod-shape that matches on-disk. Mark each field required/optional based on real corpus (not aspirational). If a field in data.md schema is NOT present in any file, flag it.
3. **Schema discrepancies** — concrete diffs between data.md current schemas and on-disk reality. For each: which Zod schema needs updating + suggested updated TypeScript snippet.
4. **`amount_usd` parser design data (B12)** — 12-row sample table, parse status, edge cases.
5. **Vault git + iCloud verification results** — commands run, output cited.
6. **Mirror-divergence audit (R0 mirror-divergence-policy)** — compare a small sample (3-5 files) between `c-suite/business-planning/` and source vault. Document drift policy recommendation: rsync? manual sync script? canonical direction?
7. **Top findings the build must act on** — numbered, severity-rated, chapter affected.

## Discipline

- Cite every schema claim with file path + line range showing the actual frontmatter (DOCTRINE law #4).
- UNKNOWN over fabrication (law #1).
- You write the report file yourself (writer ≠ grader, law #7).
- After writing, return structured summary (<400 words): report path, top findings, blocker candidates, any architecture-spec updates the orchestrator must make to `docs/architecture/data.md`.
- Use Sonnet — research-class work.

## Out of scope

- Source code of skills (R0-Skills).
- Operating-model spine docs (R0-Spine).
- customer-dashboard (R0-Code).

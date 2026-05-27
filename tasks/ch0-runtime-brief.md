# Ch.0 Runtime — Implementation Brief

## Your role

You are the Runtime engineer for C-Suite Chapter 0 (Foundations). You operate under DOCTRINE (10 non-negotiable laws in `DOCTRINE.md`). You implement against the SPEC at `docs/decisions/0001-ch0-foundations.md` (1,118 lines — read it end-to-end). You do NOT write tests (the Test dispatch owns that, in parallel with you, against the same ADR). You do NOT modify the ADR.

## Mission

Build the Ch.0 skeleton per ADR-0001. All 11 sections are deliverables. Cite the ADR section in commit messages.

## Required reads (in order)

1. `docs/decisions/0001-ch0-foundations.md` — your authoritative spec. Read end-to-end.
2. `docs/architecture/delivery.md` §repo tree — your starting structure (ADR §1 adjusts it).
3. `docs/research/R0-constraints-ledger.md` §3 (SD-01 through SD-07) — schema reality the Zod set must match.
4. `BLOCKERS.md` B21, B22, B23, B24, B26, B27, B29 — what your code must address.
5. `scripts/preflight.sh` — current state; ADR §6 extends it.
6. `scripts/install-extracted-skills.py` — current state; ADR §7 specifies the state-machine rewrite.

## Deliverables (every one of these must land before Audit/QA accepts)

### Repo skeleton (ADR §1)

- `package.json` at root: `packageManager: "pnpm@10.x"` (pin minor at install time), `engines.node: ">=22.0.0"`, workspaces.
- `pnpm-workspace.yaml` enumerating `apps/*`, `packages/*`.
- `tsconfig.json` root + per-package extends. Strict mode on.
- `apps/main/package.json`, `apps/utility/package.json`, `apps/renderer/package.json` — Electron main + utility + renderer.
- `packages/shared-types/package.json`, `packages/stub-harness/package.json`, `packages/soql-builder/package.json` (skeleton; full impl in Ch.8).
- `electron-builder.yml` per ADR §1.4. Sign/notarize keys present but **commented out** (deferred to Ch.11 — keep config shape).
- `db/migrations/` directory + first migration `001_initial.sql` per `docs/architecture/data.md` §SQLite runtime store (just the `CREATE TABLE IF NOT EXISTS schema_version` row + skeleton table creates — full schema lands in Ch.1/Ch.3).
- `.gitignore` for `node_modules/`, `dist/`, `out/`, `*.log`.

**Tool version resolution (ADR §1.2 UNKNOWN items).** At repo init, run `npx electron --version`, `npx electron-builder --version`, `npx playwright --version`, `npx vitest --version`. Update the ADR §1.2 table with `[verified <date>]` tags replacing the four UNKNOWN cells. Commit the ADR edit separately as `ch0: resolve ADR §1.2 UNKNOWNs at repo init`.

### Vault schemas (ADR §2 — the keystone)

Write `packages/shared-types/src/vault-schemas.ts` per ADR §2 verbatim:
- `ArtifactZone` type union.
- One Zod schema per artifact type — drop the `type` literal everywhere (parseArtifact injects).
- `PositionFrontmatter`, `DecisionFrontmatter`, `WorkstreamFrontmatter` (with nested `cash_impact` / `arr_impact` / `status_criteria` objects), `StakeholderFrontmatter` (`z.union([StakeholderPerson, StakeholderAccount])`), `PreMortemFrontmatter` (impact enum: `['existential', 'high', 'HIGH', 'medium']`; probability union), `PredictionFrontmatter`, `MemoFrontmatter`, `HandoffFrontmatter` (use current data.md shape — full v2 lands in Ch.9), `TripwireFrontmatter`, `CompetitorFrontmatter`.

Write `packages/shared-types/src/normalizeKeys.ts` per ADR §2:
- `normalizeKeys(obj)`: replace `-` with `_` in object keys, recursively into nested objects + arrays-of-objects.
- Export `Stringly = (k: string) => k.replace(/-/g, '_')`.

Write `packages/shared-types/src/parseArtifact.ts` per ADR §2:
- `parseArtifact<Z extends ArtifactZone>(rawYaml: unknown, zone: Z): InferType<Z>` — calls `normalizeKeys()` then routes to the right Zod schema based on zone.
- Throws typed `VaultSchemaParseError` on parse failure with the source path + zone + Zod issues.

### IPC discriminated union (ADR §3)

Write `packages/shared-types/src/ipc.ts`:
- `IpcMessage` Zod discriminatedUnion across the variants in `docs/architecture/data.md` §IPC type definitions + `docs/architecture/runtime.md` §IPC contract.
- All 22 variants per ADR.
- Export the inferred TypeScript type.
- Add `parseIpc(msg: unknown): IpcMessage` that throws on invalid.

### CI configuration (ADR §4)

Write `.github/workflows/ci.yml`:
- Triggers: `push` to `main`, `pull_request` to `main`.
- Runs on `ubuntu-latest`.
- Steps: checkout, pnpm setup (cached), `pnpm install --frozen-lockfile`, `pnpm -r exec tsc --noEmit`, `pnpm -r lint`, `pnpm -r test:unit`, `pnpm -r test:integration`. `STUB_MODE=replay` is the default env.
- Verify with `grep ANTHROPIC_API_KEY .github/workflows/` returns empty — zero live inference.

### Stub harness skeleton (ADR §5)

Write `packages/stub-harness/src/stub.ts`:
- `StubMode = 'live' | 'record' | 'replay'`.
- `StubClaudeClient` class with `invoke(definition, context)` that branches per mode.
- `loadFixture(key)` reads from `tests/fixtures/<key>.json`.
- `persistFixture(key, data)` writes to `tests/fixtures/` (record mode).
- `stableHash(role, context)` for fixture keys.
- Real SDK invocation stub for `live` mode (placeholder that throws "live not implemented" — Ch.3 wires it).

### Preflight extensions (ADR §6 — B33)

Modify `scripts/preflight.sh`:
- Add "Sync clients" section: detect Dropbox (`.dropbox` marker in vault parent), Google Drive (running process `Google Drive` or `com.google.drivefs` kext), beyond the existing iCloud check.
- Add "Skill body line count" section: for each of the 8 op-logic skills, `wc -l ~/.claude/skills/<name>/SKILL.md` and FAIL if any return <50.
- Keep all existing checks. Output format consistent with current script (FAIL / WARN / OK).

### Installer fix (ADR §7 — B29)

Rewrite `scripts/install-extracted-skills.py`'s code-block extraction as a state-machine parser per ADR §7. Replace the non-greedy regex at lines 82-88.

**Key requirement.** The state machine tracks fence-open / fence-close events. Open a fence on a line that starts with ` ``` ` (3+ backticks); the close must match the exact opener (same backtick count + no indentation). Inner fences (different language tags or backtick counts) are nested content, not closes. Skill section ends at the next H2 (`## `) or EOF.

After fix, run `python3 scripts/install-extracted-skills.py` and confirm `wc -l ~/.claude/skills/*/SKILL.md` returns ≥95% of the corresponding `business-planning/skills/<name>/SKILL.md` line count for each.

### Vault bootstrap script (ADR §8 — B22)

Write `scripts/vault-bootstrap.sh`:
- Args: `VAULT_PATH` env var or `$1` (default to `/Users/russellteter/Documents/Claude/Projects/Business Planning`).
- Idempotent: if `git -C "$VAULT_PATH" log --oneline -1 2>/dev/null` returns a commit, exit 0 with "vault already has commits — skipping."
- Else: write `.gitignore` with the lines from ADR §8.4; `git -C "$VAULT_PATH" add . && git -C "$VAULT_PATH" commit -m "vault: pre-C-Suite SafeWrite baseline"`.
- Print summary: total files staged, total bytes, commit SHA.
- **DO NOT EXECUTE THIS SCRIPT.** Write it, mark executable, commit. Russell runs it at Ch.2 prep (DOCTRINE law #10 — orchestrator does not auto-commit Russell's working-tree).

## Commit discipline

- Atomic commits per concept (NOT one giant commit). Suggested sequence:
  1. `ch0: repo skeleton + pnpm workspace + tsconfig`
  2. `ch0: electron-builder.yml (sign/notarize commented; Ch.11)`
  3. `ch0: vault-schemas.ts + normalizeKeys + parseArtifact (B21/B23/B24/B26/B27)`
  4. `ch0: ipc.ts discriminated union (22 variants)`
  5. `ch0: stub-harness skeleton`
  6. `ch0: CI workflow (zero live inference)`
  7. `ch0: preflight extensions — Dropbox/Drive + skill line-count (B33/B29)`
  8. `ch0: installer state-machine parser (B29 root-cause fix)`
  9. `ch0: vault-bootstrap.sh (B22 — Russell runs at Ch.2 prep)`
  10. `ch0: resolve ADR §1.2 UNKNOWNs at repo init`
- Each auto-pushes via post-commit hook. Verify after the last commit by checking `tail -5 .git/auto-push.log`.

## Discipline

- SPEC is the ADR. Do not re-interpret; if the ADR is unclear, surface to orchestrator rather than guessing.
- Cite the ADR section in code comments only when the WHY is non-obvious (DOCTRINE; Russell's no-comment default).
- UNKNOWN over fabrication (DOCTRINE #1). If a version pin fails at install, surface — don't substitute silently.
- After commits land, return structured summary (under 500 words):
  - Files created (paths only, count).
  - ADR §1.2 UNKNOWN values resolved (the 4 versions you locked).
  - Commit SHAs (last 10).
  - Any spec ambiguity you had to resolve — what + how.
  - Status of `tail -5 .git/auto-push.log` (push success).

## Out of scope

- Tests (Test dispatch handles, in parallel).
- ADR modification (Architect owns).
- Vault writes (Russell runs vault-bootstrap.sh manually).
- Cowork integration (Ch.9).
- Lens / Synthesizer / Verifier prompts (Ch.4).
- Audit/QA work (separate sub-agent post-build).

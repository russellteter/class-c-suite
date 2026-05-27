# ADR-0001: Chapter 0 Foundations — Repo Skeleton, Vault Schema Reality, IPC Contract, CI, Stub Harness, Preflight + Installer Fixes, Vault Bootstrap

## Status

`accepted` (under DOCTRINE operating-mode override; Russell may override at chapter boundary by editing this file).

## Date

2026-05-26

## Author / agent role

Backend Architect (Opus 4.7) under DOCTRINE writer ≠ grader (Audit/QA re-derives PASS/FAIL from Section 9 in chapter ritual step 6).

## Context

Chapter 0 sets every contract every subsequent chapter codes against. Phase R surfaced **20 architecture-spec patches owed to the Ch.0 architect** (`docs/build-log.md` §2026-05-26 — Phase R complete, lines 273-322). This ADR resolves items **1, 18, 19, 20** of that OWED list (items 2-17 belong to Ch.1-11 architects per the per-chapter ritual). The chapter sequencing law (`ROADMAP.md` lines 6-19) makes Ch.0 the foundation under SafeWrite (Ch.2), Runtime spine (Ch.3), Verifier rigor (Ch.4), and the first end-to-end slice (Ch.5).

**Forces in play:**

- **Vault schema reality is incompatible with the seeded Zod schemas in `docs/architecture/data.md`.** R0-Vault verified across 75+ vault files (`docs/research/R0-constraints-ledger.md` lines 36-298 and §3 SD-01 through SD-07): every artifact lacks a `type:` discriminator (B21); kebab vs snake key naming is mixed within single artifact types (B23); `WorkstreamFrontmatter` is under-specified by 10+ real fields (B24); `StakeholderFrontmatter` bifurcates by subdirectory (B27); `PreMortemFrontmatter.impact` enum has zero overlap with reality (B26); `DecisionFrontmatter` field names and status enum mismatch (SD-06); `PredictionFrontmatter` has wrong field names (SD-07). Without correction, the Zod parser fails for 100% of vault reads.
- **Vault git has zero commits** (`BLOCKERS.md` B22, P0; verified via `git log --oneline -5` returning `fatal: your current branch 'main' does not have any commits yet`, `docs/research/R0-constraints-ledger.md` lines 517-523). SafeWrite's per-write commit pattern produces orphan history until the baseline lands.
- **`scripts/install-extracted-skills.py` writes truncated SKILL.md stubs** (B29, P2). Root cause is in `scripts/install-extracted-skills.py` lines 82-88 — the non-greedy regex `^```(?:markdown|yaml|md)?\s*\n(.*?)^```` stops at the FIRST closing fence within a skill section, so any skill containing internal code fences is truncated (`docs/research/R2-feasibility-notes.md` §Area 8 lines 236-246). 6 of 8 installed stubs are 15-29 lines vs 168-232 full-body.
- **Preflight detects iCloud only** (`scripts/preflight.sh` lines 47-55). R2 §Area 4 (lines 199-205) flagged Dropbox + Google Drive sync as equivalent atomic-rename hazards (B33, P2).
- **Cost discipline.** TypeScript monorepo + Electron + pnpm + Zod + Vitest is the locked stack per `docs/architecture/delivery.md` lines 75-150. Specific majors must be pinned so Ch.1+ builds are reproducible and CI runs deterministically.

**Related BLOCKERS:** B3, B8, B14, B16, B21, B22, B23, B24, B26, B27, B29, B30, B31, B32, B33.
**Related ROADMAP exit criteria:** `ROADMAP.md` lines 44-53 (Ch.0 exit gate).
**Related PRD §5 locked principles:** no shortcuts, source-id rigor, vault as canonical SoT, on-Mac native, no secrets in plaintext.

---

## Decision

Ship the eleven contracts below as the Ch.0 deliverable set. Each is a drop-in specification — Runtime + Test dispatches implement against this ADR without further interpretation. **No production code in this ADR**; runnable specs only.

---

## Section 1 — Repo skeleton + pinned tool versions

### 1.1 Directory tree

The `apps/` + `packages/` + `db/` + `tests/` + `scripts/` + `docs/` layout from `docs/architecture/delivery.md` lines 75-150 stands with two refinements:

- Add `packages/shared-types/src/parseArtifact.ts` (B21 wrapper, this ADR §2).
- Add `packages/shared-types/src/normalizeKeys.ts` (B23 middleware, this ADR §2).
- Add `packages/shared-types/src/vault-schemas.ts` (the corrected Zod set, this ADR §2).
- Add `packages/shared-types/src/ipc.ts` (the IPC discriminated union, this ADR §3).
- Add `packages/stub-harness/src/stub.ts` per `docs/architecture/delivery.md` lines 156-176.
- Add `db/migrations/` per `docs/architecture/data.md` lines 280-386.
- Add `tests/fixtures/vault/` with a one-of-each-artifact-type canned corpus for parser tests.
- Add `.github/workflows/ci.yml` per this ADR §4.
- Add `scripts/vault-bootstrap.sh` per this ADR §8.
- `business-planning/` mirror remains in the repo unchanged until Russell decides B28 (Phase R surfaced; not Ch.0 scope).

### 1.2 Pinned tool versions

| Tool | Pinned major | Rationale + citation |
|---|---|---|
| **pnpm** | **10.x** (≥10.0; recommended 10.29+) | Latest is 10.29 per context7 `/pnpm/pnpm.io` blog "10.29.md" (release notes 2025/2026). Workspace protocol stable. Pin via `packageManager: "pnpm@10.x"` in root `package.json` + Corepack-enabled Node. |
| **TypeScript** | **5.x** (≥5.6) | Zod 4 requires TS 5.x per Zod 4 release notes (context7 `/websites/zod_dev_v4` "Why a new major version" — strict mode + improved inference depend on TS 5.x). |
| **Electron** | **Latest stable major at repo init (verify with `npx electron --version`)** — minimum acceptable: any major within Electron's current 3-version support window. As of 2026, the example in Electron's official "Version support policy" (context7 `/websites/electronjs`) shows "42.x stable / 41.x / 40.x supported." Pin the latest stable at repo init and document the pinned major in the root `package.json` `engines.electron` field. **UNKNOWN — needs `npx electron --version` at repo init to lock the exact number.** | `utilityProcess.fork(modulePath, args?, options?)` is the current pattern (context7 `/websites/electronjs` "utilityProcess.fork" — Required: `modulePath`; macOS-specific options `allowLoadingUnsignedLibraries` + `disclaim` documented). R2 §Area 2 lines 174-185 confirmed `utilityProcess.fork()` stable and current. |
| **electron-builder** | **26.x** (latest stable at repo init) | Native `notarize` boolean + `mac.hardenedRuntime: true` + `entitlements`/`entitlementsInherit` keys confirmed via context7 `/electron-userland/electron-builder` "macOS Build Configuration" snippet. `notarytool` (not `altool`, which was removed November 2023 per R2 §Area 7) is the only valid notarization tool — pass via `@electron/notarize` (scoped) hook in `afterSign`. **Pin the exact major at repo init.** |
| **@electron/notarize** | **2.x** scoped (NOT the unscoped `electron-notarize`) | R2 §Area 7 confirmed scoped package is current. |
| **@electron/osx-sign** | **1.x** scoped (NOT unscoped `electron-osx-sign`) | Same source. |
| **@electron/rebuild** | **3.x** (the rebuild tool for native modules) | Replaces `electron-rebuild` (unscoped, deprecated). Must run in CI build step, not only at dev install, per `BLOCKERS.md` B14 — "electron-rebuild must run as part of the build step, not just at dev-install time." |
| **vitest** | **3.x** (≥3.2) | Versions list (context7 `/vitest-dev/vitest`) shows v3_2_4 as the stable production line; v4.x exists but per `~/.claude/CLAUDE.md` cost-discipline "default to stable minor of the previous major" until v4 stabilizes for Vite ecosystem. Pin `3.x` for the unit + integration layers. Re-evaluate at Ch.12 if vitest 4 has wider adoption. |
| **Playwright** | **1.x** (latest, ≥1.50) | E2E over Electron renderer per `docs/architecture/delivery.md` line 138. Pin major; exact minor follows electron-builder + Electron pin. **UNKNOWN — verify electron-playwright peer compat at repo init.** |
| **Zod** | **4.x** (≥4.0) | Zod 4 stable per context7 `/websites/zod_dev_v4` — "Zod 4 is the latest stable version." `z.discriminatedUnion` API upgraded in v4 (composable + supports union/pipe discriminators); v4 also supports `z.literal([...])` array form. Used directly in §2 + §3 below. |
| **React** | **18.x** (≥18.3) | Conservative — Zod 4 has no React peer-dep coupling (Zod is a runtime validator, no React integration). React 19 exists but the C-Suite renderer is single-user / non-SSR; React 18 LTS sufficient. **UNKNOWN — verify Vite + React 18 + Electron renderer peer-deps at repo init; bump to 19 if no friction.** |
| **Tailwind** | **3.x** (≥3.4) | Standard renderer styling per `docs/architecture/delivery.md` line 117. Tailwind 4 exists but introduces breaking config changes; Ch.5 mockup-gate is the right boundary to consider 4. |
| **better-sqlite3** | **11.x** (latest stable) | Must be re-compiled per Electron major via `@electron/rebuild` (B14). Pin major; CI build step runs `@electron/rebuild` against the pinned Electron Node ABI before `electron-builder` packages. |
| **chokidar** | **3.x** | Per `docs/architecture/data.md` lines 266-277 — already specified. No change. |
| **simple-git** | **3.x** | For SafeWrite git operations (Ch.2). Pin major. |
| **better-sqlite3-multiple-ciphers** | Not used in V1 | SQLite is local-only; encryption deferred. |
| **Node.js runtime** | **22.x LTS** (Active LTS in 2026 per Node release schedule) | Electron stable bundles its own Node; dev/CI Node is for tooling. pnpm 10.x requires Node 18.12+; pick 22.x LTS. |

**Tool-version verification protocol (DOCTRINE law #1).** At repo init, the Runtime dispatch runs `npx electron --version`, `npx electron-builder --version`, `npx playwright --version`, `npx vitest --version` and writes the exact lock-file versions back into this ADR (Section 1.2 table) as `[verified <date>]` tags. UNKNOWN entries above MUST be resolved before CI runs.

### 1.3 `packageManager` + `engines`

Root `package.json`:

```jsonc
{
  "packageManager": "pnpm@10.x",  // exact resolved at repo init
  "engines": {
    "node": ">=22.0.0 <23.0.0",
    "pnpm": ">=10.0.0"
  }
}
```

### 1.4 `electron-builder.yml` shape (Ch.11 wiring deferred; shape decided now)

Per `docs/architecture/delivery.md` lines 224-241, with R2 corrections (B14 + B33):

```yaml
appId: com.classedu.csuite
productName: C-Suite
artifactName: "${productName}-${version}-${arch}.${ext}"
directories:
  output: dist
mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch: [arm64, x64]
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  notarize: true       # uses @electron/notarize via afterSign hook
dmg:
  sign: false
afterSign: scripts/notarize.cjs  # Ch.11 implements; signs via @electron/notarize
```

`build/entitlements.mac.plist` minimum keys (B14 R2 verified, lines 116-134):

- `com.apple.security.cs.allow-jit` — **REQUIRED** (V8 JIT).
- `com.apple.security.cs.disable-library-validation` — only if pre-built `better-sqlite3` binary signing fails (defer to Ch.11 hardening; default OMIT).
- `com.apple.security.cs.allow-unsigned-executable-memory` — only if utility process uses `allowLoadingUnsignedLibraries: true` (default FALSE → omit).

Notarization tool: **`xcrun notarytool submit --wait` then `xcrun stapler staple`** (per B14 R2: "`altool` is dead — removed November 2023"). Use `@electron/notarize` library wrapper.

macOS target version reference: **Sequoia 15.x+** (NOT 14.4+ — B33 spec correction; Darwin 24.x = macOS Sequoia 15.x).

---

## Section 2 — Corrected Zod schema set (B21 + B23 + B24 + B26 + B27 + SD-06 + SD-07)

The byte-for-byte schemas below are sourced from `docs/research/R0-constraints-ledger.md` §3 SD-01 through SD-07 (lines 302-484). All `type: z.literal(...)` fields are **dropped** — `parseArtifact(rawYaml, zone)` injects `type` at parse time from the file-path zone. All keys remain in their canonical snake form — the `normalizeKeys()` middleware converts kebab → snake before Zod.parse().

Drop the following into `packages/shared-types/src/vault-schemas.ts`:

### 2.1 `vault-schemas.ts` (top of file — first 10 load-bearing lines)

```typescript
// packages/shared-types/src/vault-schemas.ts
// Source: docs/research/R0-constraints-ledger.md §3 SD-01 through SD-07
// (verified against 75+ vault files 2026-05-26 by R0-Vault sub-agent).
// `type` field injected by parseArtifact(rawYaml, zone) — NOT in vault YAML.
import { z } from 'zod';

export type ArtifactZone =
  | 'position' | 'decision' | 'workstream' | 'stakeholder_person'
  | 'stakeholder_account' | 'pre-mortem' | 'prediction' | 'memo'
  | 'handoff' | 'tripwire' | 'competitor';
```

### 2.2 `PositionFrontmatter` (SD-01 + observed keys, R0 ledger §2.1 lines 36-65)

```typescript
export const PositionFrontmatter = z.object({
  // type field injected at parse time — DO NOT add z.literal here.
  id: z.string(),                                    // "POS-001"
  slug: z.string(),                                  // kebab slug
  title: z.string(),
  status: z.string(),                                // observed "active" only; keep open
  confidence: z.number().int().min(0).max(100),
  created: z.string(),                               // YYYY-MM-DD
  last_updated: z.string(),                          // normalized from last-updated
  last_retested: z.string(),                         // normalized from last-retested
  supersedes: z.string().nullable(),                 // POS-id or null
  superseded_by: z.string().nullable(),              // normalized from superseded-by
  authored_by: z.string(),                           // normalized from authored-by
  decision_this_supports: z.string(),                // normalized from decision-this-supports
  predictions_spawned: z.array(z.string()),
  source: z.string(),
  correction_log: z.array(z.string()).optional(),    // POS-014 only; strings (not objects)
}).passthrough();
export type PositionFrontmatter = z.infer<typeof PositionFrontmatter>;
```

### 2.3 `DecisionFrontmatter` (SD-06, R0 ledger §2.2 + §3 lines 449-465)

```typescript
export const DecisionFrontmatter = z.object({
  id: z.string(),                                    // "DEC-005"
  title: z.string(),
  date_proposed: z.string(),                         // RENAMED from decided_on (snake on-disk)
  decision_maker: z.string(),                        // free text
  status: z.enum(['proposed', 'in-execution', 'resolved-correct', 'deferred']),
  reversibility: z.string(),                         // free text (NOT enum low|medium|high)
  confidence: z.number().int().optional(),
  source: z.string(),
  // Additive fields injected by Ch.6 write-back engine (B13):
  linked_positions: z.array(z.string()).optional(),
  predictions_spawned: z.array(z.string()).optional(),
  tripwires: z.array(z.string()).optional(),
  executed_by: z.string().nullable().optional(),     // path to Cowork handoff or output (Ch.9)
}).passthrough();
export type DecisionFrontmatter = z.infer<typeof DecisionFrontmatter>;
```

### 2.4 `WorkstreamFrontmatter` (SD-03, R0 ledger §3 lines 348-387 — 15-field expanded shape)

```typescript
export const WorkstreamFrontmatter = z.object({
  workstream_id: z.string(),                         // "WS-01" (WS-03 uses 'id' — see union below)
  title: z.string(),
  owner: z.string(),
  phase: z.string(),                                 // free text
  status: z.string(),                                // observed "GREEN" | "YELLOW" | "RED" | "YELLOW (will move GREEN...)"
  status_criteria: z.object({
    green: z.string(),
    yellow: z.string(),
    red: z.string(),
    orange: z.string().optional(),                   // WS-13 only
  }),
  cash_impact: z.object({
    amount_usd: z.union([z.string(), z.number()]),   // free text OR bare 0 (WS-04/11)
    direction: z.string(),
    timing: z.string(),
  }),
  arr_impact: z.object({
    amount_usd: z.union([z.string(), z.number()]),
    direction: z.string(),
    timing: z.string(),
  }),
  people_involved: z.array(z.string()),
  depends_on: z.array(z.string()),
  depended_on_by: z.array(z.string()),
  next_milestone: z.string(),
  next_milestone_date: z.string(),                   // date or "TBD"
  decisions_pending: z.array(z.string()),
  linked_positions: z.array(z.string()),
  linked_decisions: z.array(z.string()),
  last_updated: z.string(),
}).passthrough();

// WS-03 minimal variant (R0 ledger §2.3 lines 124-134): use 'id' instead of 'workstream_id'.
export const WorkstreamMinimalFrontmatter = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  owner: z.string(),
  phase: z.string(),
  last_updated: z.string(),
  source: z.string(),
}).passthrough();

export const WorkstreamFrontmatterUnion = z.union([
  WorkstreamFrontmatter,
  WorkstreamMinimalFrontmatter,
]);
export type WorkstreamFrontmatterUnion = z.infer<typeof WorkstreamFrontmatterUnion>;
```

**SQLite mirror parser note (B24).** The `workstream_amounts_mirror` parser in `db/migrations/` reads `cash_impact.amount_usd` (nested), NOT a top-level field. Handle both string and number per the union above.

### 2.5 `StakeholderFrontmatter` (SD-04, R0 ledger §3 lines 393-427 — discriminated `z.union`)

```typescript
export const StakeholderPersonFrontmatter = z.object({
  name: z.string(),                                  // e.g. "chasen-michael-ceo"
  sensitivity: z.string(),                           // "HIGH"
  last_known_status: z.string(),                     // "WARM" | "HOT"
  last_refresh: z.string(),                          // YYYY-MM-DD
  source: z.string(),
}).passthrough();

export const StakeholderAccountFrontmatter = z.object({
  account_id: z.string(),                            // SF account ID (discriminator key)
  account_name: z.string(),
  short_name: z.string(),
  segment: z.string(),
  territory: z.string(),
  location: z.string(),
  customer_type: z.string(),
  total_contacts: z.number().int(),
  account_owner: z.string(),
  current_opp_owner: z.string(),
  mediated_through: z.string().optional(),
  class_share_of_arr: z.string(),
  last_updated: z.string(),
  linked_pre_mortems: z.array(z.string()).optional(),    // normalized from linked_pre-mortems
  linked_tripwires: z.array(z.string()).optional(),
  linked_positions: z.array(z.string()).optional(),
  linked_workstreams: z.array(z.string()).optional(),
  sensitivity: z.string(),
}).passthrough();

// Discriminate by presence of `account_id` (per R0 ledger §3 SD-04 line 422):
export const StakeholderFrontmatter = z.union([
  StakeholderPersonFrontmatter,
  StakeholderAccountFrontmatter,
]);
export type StakeholderFrontmatter = z.infer<typeof StakeholderFrontmatter>;
```

### 2.6 `PreMortemFrontmatter` (SD-05, R0 ledger §3 lines 433-447 — corrected enum + probability union)

```typescript
export const PreMortemFrontmatter = z.object({
  id: z.string().optional(),                         // absent in snake variant
  slug: z.string().optional(),                       // absent in snake variant
  name: z.string().optional(),                       // snake variant only
  probability: z.union([
    z.number().int(),                                // kebab files: bare integer (15, 25)
    z.string().regex(/^\d+%$/),                      // snake files: "30%"
  ]),
  impact: z.enum(['existential', 'high', 'HIGH', 'medium']),
  last_reviewed: z.string(),                         // normalized from last-reviewed
  related_positions: z.array(z.string()).optional(), // normalized from related-positions
  related_workstreams: z.array(z.string()).optional(),
  related_pre_mortems: z.array(z.string()).optional(),
  related_tripwires: z.array(z.string()).optional(),
  depends_on: z.array(z.string()).optional(),        // normalized from depends-on
  source: z.string().optional(),
}).passthrough();
export type PreMortemFrontmatter = z.infer<typeof PreMortemFrontmatter>;
```

### 2.7 `PredictionFrontmatter` (SD-07, R0 ledger §3 lines 471-484)

```typescript
export const PredictionFrontmatter = z.object({
  id: z.string(),
  claim: z.string(),
  confidence: z.union([z.number().int(), z.string().regex(/^\d+$/)]),
  resolution_date: z.string().optional(),            // snake: resolution_date; kebab normalized
  spawned_by: z.string().optional(),
  position: z.string().optional(),                   // PRED-007 only
  spawned: z.string().optional(),                    // PRED-007 creation date
  resolution_criterion: z.string().optional(),       // PRED-007 only (normalized from resolution-criterion)
  status: z.enum(['open', 'resolved']),
  source: z.string().optional(),
}).passthrough();
export type PredictionFrontmatter = z.infer<typeof PredictionFrontmatter>;
```

### 2.8 Additional schemas (memo, handoff, tripwire, competitor)

```typescript
// MemoFrontmatter — memos/ directory does NOT yet exist (R0 §2.10).
// Schema is aspirational; Ch.5 Synthesizer creates first memos.
export const MemoFrontmatter = z.object({
  run_id: z.string(),
  playbook: z.string(),
  question: z.string(),
  created: z.string(),
  rigor_score: z.number().int().min(0).max(100),
  rigor_threshold: z.number().int(),
  status: z.enum(['clean', 'draft', 'quick_read', 'ad_hoc']),
  failure_reasons: z.array(z.string()).optional(),
  citations: z.array(z.object({
    claim_id: z.string(),
    source_id: z.string(),
    call_id: z.string(),
  })),
  proposed_writebacks: z.array(z.object({
    artifact_type: z.string(),
    draft_path: z.string(),
  })).optional(),
  handoff_path: z.string().optional(),
}).passthrough();

// HandoffFrontmatter v2 (phase-r-decisions.md §Decision 10(a) lines 217-228; also
// build-log OWED item #17 — Ch.9 deepens, Ch.0 ships the schema shape).
export const HandoffFrontmatter = z.object({
  id: z.string(),
  decision_id: z.string().optional(),
  memo_id: z.string().optional(),
  created: z.string(),
  cowork_brand_skills: z.array(z.string()),
  status: z.enum(['drafted', 'sent', 'executed']),
}).passthrough();

// TripwireFrontmatter (R0 §2.8 — financial-tripwires/ shape)
export const TripwireFrontmatter = z.object({
  tripwire_id: z.string(),
  title: z.string(),
  category: z.string(),
  source: z.string(),
  owner: z.string(),
  scan_cadence: z.string(),
  escalation: z.string(),
  last_updated: z.string(),
}).passthrough();

// CompetitorFrontmatter (R0 §2.7 — competitor-watch/ shape)
export const CompetitorFrontmatter = z.object({
  competitor: z.string(),
  threat_level: z.string(),
  last_updated: z.string(),
  last_signal: z.string(),
  sources: z.array(z.string()),
}).passthrough();
```

### 2.9 `normalizeKeys.ts` (B23 middleware)

`packages/shared-types/src/normalizeKeys.ts`:

```typescript
/**
 * Recursively replace `-` with `_` on object keys.
 * Source: docs/research/R0-constraints-ledger.md §SD-02 (lines 329-346).
 * Used BEFORE Zod.parse() on every vault YAML read.
 */
export function normalizeKeys<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(normalizeKeys) as unknown as T;
  }
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.replace(/-/g, '_'),
        normalizeKeys(v),
      ]),
    ) as T;
  }
  return obj;
}
```

### 2.10 `parseArtifact.ts` (B21 wrapper)

`packages/shared-types/src/parseArtifact.ts`:

```typescript
/**
 * Parse vault artifact YAML frontmatter.
 * Source: docs/research/R0-constraints-ledger.md §SD-01 (lines 309-323).
 * Injects `type` from file-path zone (NOT from YAML — the on-disk `type:` key
 * is absent from every vault artifact per R0-Vault verification).
 */
import { z } from 'zod';
import {
  PositionFrontmatter, DecisionFrontmatter, WorkstreamFrontmatterUnion,
  StakeholderFrontmatter, PreMortemFrontmatter, PredictionFrontmatter,
  MemoFrontmatter, HandoffFrontmatter, TripwireFrontmatter, CompetitorFrontmatter,
  type ArtifactZone,
} from './vault-schemas.js';
import { normalizeKeys } from './normalizeKeys.js';

const ZoneToSchema = {
  position: PositionFrontmatter,
  decision: DecisionFrontmatter,
  workstream: WorkstreamFrontmatterUnion,
  stakeholder_person: StakeholderFrontmatter,    // union handles both shapes
  stakeholder_account: StakeholderFrontmatter,
  'pre-mortem': PreMortemFrontmatter,
  prediction: PredictionFrontmatter,
  memo: MemoFrontmatter,
  handoff: HandoffFrontmatter,
  tripwire: TripwireFrontmatter,
  competitor: CompetitorFrontmatter,
} as const satisfies Record<ArtifactZone, z.ZodTypeAny>;

/**
 * Zone is derived from file path BEFORE this is called.
 * Example mapping: positions/active/POS-001.md → 'position'
 *                  stakeholders/customers-top-arr/seu-bme.md → 'stakeholder_account'
 *                  stakeholders/internal-exec-board/x.md → 'stakeholder_person'
 */
export function parseArtifact(rawYaml: unknown, zone: ArtifactZone) {
  const normalized = normalizeKeys(rawYaml);
  const schema = ZoneToSchema[zone];
  return schema.parse(normalized);
}

/**
 * Zone classifier — file-path → ArtifactZone.
 * Ch.1 indexer wires this into the chokidar event handler.
 */
export function zoneFor(absolutePath: string): ArtifactZone | null {
  const p = absolutePath.toLowerCase();
  if (p.includes('/positions/')) return 'position';
  if (p.includes('/decisions/')) return 'decision';
  if (p.includes('/workstreams/')) return 'workstream';
  if (p.includes('/stakeholders/customers-')) return 'stakeholder_account';
  if (p.includes('/stakeholders/')) return 'stakeholder_person';
  if (p.includes('/pre-mortems/')) return 'pre-mortem';
  if (p.includes('/calibration/predictions/')) return 'prediction';
  if (p.includes('/memos/')) return 'memo';
  if (p.includes('/handoffs/')) return 'handoff';
  if (p.includes('/adversarial/financial-tripwires/')) return 'tripwire';
  if (p.includes('/adversarial/competitor-watch/')) return 'competitor';
  return null;  // read-only zones + investigations/ + deliverables/ return null
}
```

---

## Section 3 — IPC discriminated union (the typed cross-process contract)

The full IpcMessage union for `packages/shared-types/src/ipc.ts`, codified from `docs/architecture/runtime.md` lines 44-63 + `docs/architecture/data.md` lines 477-505. **Every `kind` enumerated.** Zod 4 `z.discriminatedUnion` per context7 `/websites/zod_dev_v4` "Compose Zod discriminated unions."

```typescript
// packages/shared-types/src/ipc.ts
// Source: docs/architecture/runtime.md §IPC contract (lines 41-63) +
// docs/architecture/data.md §IPC type definitions (lines 477-505).
// All cross-process messages tagged with `kind`; validated at receive time.
import { z } from 'zod';

// --- Payload sub-schemas ---
const PlaybookId = z.enum([
  'cash_lever_vs_trough', 'stakeholder_1on1_prep', 'quick_multi_lens_read',
  'pre_mortem_on_proposed_action', 'gtm_resource_reallocation',
  'strategic_option_evaluation', 'board_narrative_prep', 'restructure_decision',
  'open_qa',
]);

const AgentRole = z.enum([
  'CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS',
  'RedTeam', 'Steelman',
  'Synthesizer', 'Verifier',
  'Handoff', 'RunCritic',
]);

const McpService = z.enum([
  'salesforce', 'netsuite', 'aws', 'gmail', 'chorus', 'powerbi',
]);

const JobName = z.enum([
  'monday-tripwire',         // 6am ET financial tripwire + weekly cash forecast
  'monday-stakeholder',      // 7am ET stakeholder activity refresh
  'sunday-renewal',          // 6pm ET renewal forecast + Chorus sweep
  'sunday-dashboard',        // 8pm ET workstream dashboard regen + memory consolidation
  'daily-morning-brief',     // 6am ET six-lens compact read
]);

const JobPayload = z.object({
  jobName: JobName,
  jobId: z.string(),
  firedAt: z.number(),                     // ms epoch
  finishedAt: z.number().nullable().optional(),
  status: z.enum(['success', 'failed', 'degraded']).optional(),
  degradedSources: z.array(McpService).optional(),
  errorMessage: z.string().optional(),
});

// --- Discriminated union (every kind from runtime.md lines 46-63) ---
export const IpcMessage = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('run.start'),
    payload: z.object({
      runId: z.string(),
      playbook: PlaybookId,
      question: z.string(),
    }),
  }),
  z.object({
    kind: z.literal('run.plan.ready'),
    payload: z.object({
      runId: z.string(),
      planJson: z.string(),
      autoApproveAfterMs: z.number().nullable(),
    }),
  }),
  z.object({
    kind: z.literal('run.plan.approved'),
    payload: z.object({ runId: z.string() }),
  }),
  z.object({
    kind: z.literal('run.failed'),
    payload: z.object({
      runId: z.string(),
      reason: z.string(),
      stage: z.string(),                   // e.g. 'verifier-input-contract'
    }),
  }),
  z.object({
    kind: z.literal('agent.start'),
    payload: z.object({
      runId: z.string(),
      agentId: z.string(),
      role: AgentRole,
    }),
  }),
  z.object({
    kind: z.literal('agent.tool.pre'),
    payload: z.object({
      runId: z.string(),
      agentId: z.string(),
      tool: z.string(),
      args: z.unknown(),                   // full args persisted for click-through
    }),
  }),
  z.object({
    kind: z.literal('agent.tool.post'),
    payload: z.object({
      runId: z.string(),
      agentId: z.string(),
      tool: z.string(),
      result: z.unknown(),                 // FULL result, not summary (data.md L329)
      sourceId: z.string(),
      callId: z.string(),                  // join key to tool_calls SQLite row
    }),
  }),
  z.object({
    kind: z.literal('agent.complete'),
    payload: z.object({
      runId: z.string(),
      agentId: z.string(),
      role: AgentRole,
      structuredOutput: z.unknown(),       // parsed + validated per AgentDefinition.outputSchema
    }),
  }),
  z.object({
    kind: z.literal('agent.heartbeat'),    // B34 mitigation: NOT raw token events
    payload: z.object({
      runId: z.string(),
      agentId: z.string(),
      tokensSoFar: z.number(),
      messageSnippet: z.string().optional(),  // ≤80 chars; for "thinking…" indicator
    }),
  }),
  z.object({
    kind: z.literal('synthesizer.draft'),
    payload: z.object({
      runId: z.string(),
      memoMarkdown: z.string(),
      citations: z.array(z.object({
        claimId: z.string(),
        sourceId: z.string(),
        callId: z.string(),
      })),
    }),
  }),
  z.object({
    kind: z.literal('verifier.score'),
    payload: z.object({
      runId: z.string(),
      score: z.number().int().min(0).max(100),
      breakdown: z.object({
        claim_source: z.number().int(),
        coverage: z.number().int(),
        red_team: z.number().int(),
        calibration: z.number().int(),
        falsifier: z.number().int(),
      }),
      failures: z.array(z.string()),
    }),
  }),
  z.object({
    kind: z.literal('writeback.proposed'),
    payload: z.object({
      runId: z.string(),
      writebackId: z.string(),
      artifactType: z.string(),
      draftPath: z.string(),
    }),
  }),
  z.object({
    kind: z.literal('writeback.committed'),
    payload: z.object({
      runId: z.string(),
      writebackId: z.string(),
      artifactPath: z.string(),
      gitSha: z.string(),
    }),
  }),
  z.object({
    kind: z.literal('safewrite.conflict'),
    payload: z.object({
      path: z.string(),
      sidecarPath: z.string(),
    }),
  }),
  z.object({
    kind: z.literal('scheduler.throttle'),
    payload: z.object({
      reason: z.string(),
      retryAt: z.number().nullable(),       // ms epoch or null if degraded-sequential
    }),
  }),
  z.object({
    kind: z.literal('job.started'),
    payload: JobPayload,
  }),
  z.object({
    kind: z.literal('job.finished'),
    payload: JobPayload,
  }),
  z.object({
    kind: z.literal('job.failed'),
    payload: JobPayload,
  }),
  z.object({
    kind: z.literal('mcp.auth.expired'),
    payload: z.object({
      service: McpService,
    }),
  }),
  z.object({
    kind: z.literal('vault.changed'),
    payload: z.object({
      path: z.string(),
      changeType: z.enum(['added', 'modified', 'deleted']),
    }),
  }),
  z.object({
    kind: z.literal('cost.usage'),
    payload: z.object({
      runId: z.string().optional(),
      jobId: z.string().optional(),
      tokensIn: z.number(),
      tokensOut: z.number(),
      windowRemainingTokens: z.number(),
      windowResetsAt: z.number(),
      totalCostUsdReference: z.number().optional(),  // B5: API-equivalent reference figure
    }),
  }),
]);

export type IpcMessage = z.infer<typeof IpcMessage>;

/** Receivers (main, utility, renderer) call this on every incoming message. */
export function validateIpc(raw: unknown): IpcMessage {
  return IpcMessage.parse(raw);  // throws on invalid; receiver logs + drops
}
```

**Receiver discipline.** Main, utility, and renderer all call `validateIpc(raw)` on receipt. Invalid messages throw and log; never silently mutate the receiver's state.

---

## Section 4 — CI configuration

`.github/workflows/ci.yml`:

```yaml
# Source: docs/architecture/delivery.md §CI pipeline (lines 189-205).
# Zero live inference. E2E + sign/notarize run locally on Russell's Mac (Ch.11).

name: ci
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest        # delivery.md L194 — no notarize in CI
    timeout-minutes: 20

    env:
      STUB_MODE: replay           # delivery.md L176 — CI never calls live Claude
      CI: 'true'

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10               # pin major; lockfile resolves exact
          run_install: false

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies (frozen lockfile)
        run: pnpm install --frozen-lockfile

      - name: Rebuild native modules for current Node ABI
        # NOTE: this is CI Node ABI rebuild, not Electron ABI (which happens
        # in the build step on Ch.11). better-sqlite3 must rebuild against
        # the CI runner's Node 22 ABI for unit/integration tests to load it.
        run: pnpm rebuild

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Unit tests
        run: pnpm test:unit

      - name: Integration tests (stub-harness)
        run: pnpm test:integration
        env:
          STUB_MODE: replay

      # Fuzz suite added at Ch.2 (SafeWrite). Skip if step missing.
      - name: Fuzz tests
        if: ${{ hashFiles('tests/fuzz/**/*') != '' }}
        run: pnpm test:fuzz

      # E2E + sign/notarize NOT in CI — run on Russell's Mac at Ch.11.
```

**Cache strategy.** `actions/setup-node@v4` `cache: 'pnpm'` caches the pnpm store keyed on `pnpm-lock.yaml` hash — invalidated automatically on lockfile change. `pnpm install --frozen-lockfile` enforces lockfile + manifest match (per `~/.claude/rules/commit-lockfile-with-manifest.md`).

**Node version.** 22 (Active LTS in 2026 per Node release schedule). Electron stable bundles its own Node (different ABI); the CI Node here is for the tooling layer only.

---

## Section 5 — Stub-harness skeleton

`packages/stub-harness/src/stub.ts` per `docs/architecture/delivery.md` lines 156-176:

```typescript
// packages/stub-harness/src/stub.ts
// Source: docs/architecture/delivery.md §Stub-model harness (lines 152-176).
// CI default: STUB_MODE=replay. Developer runs `live` and can `record` new
// fixtures. Fixtures persist under tests/fixtures/.

import { createHash } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

export type StubMode = 'live' | 'record' | 'replay';

// AgentDefinition + ContextBundle + AgentOutput types imported from
// packages/shared-types when Ch.3 lands. For Ch.0, declare structural-only:
export interface AgentDefinitionLike { role: string; systemPrompt: string; }
export interface ContextBundleLike { question: string; [k: string]: unknown; }
export interface AgentOutputLike { structuredOutput: unknown; tokensIn: number; tokensOut: number; }

export class StubClaudeClient {
  constructor(
    private readonly mode: StubMode,
    private readonly fixtureDir: string,
  ) {}

  async invoke(definition: AgentDefinitionLike, context: ContextBundleLike): Promise<AgentOutputLike> {
    const key = this.stableHash(definition.role, context);

    if (this.mode === 'live') {
      // Ch.3 wires the real SDK; until then, throw to make accidental live
      // calls in tests obvious.
      throw new Error('StubMode=live not wired in Ch.0; Runtime dispatch implements at Ch.3');
    }

    if (this.mode === 'record') {
      throw new Error('StubMode=record not wired in Ch.0; Runtime dispatch implements at Ch.3');
    }

    // replay (CI default)
    return this.loadFixture(key);
  }

  private stableHash(role: string, context: ContextBundleLike): string {
    const h = createHash('sha256');
    h.update(role);
    h.update(JSON.stringify(context, Object.keys(context).sort()));
    return h.digest('hex').slice(0, 16);
  }

  private async loadFixture(key: string): Promise<AgentOutputLike> {
    const p = path.join(this.fixtureDir, `${key}.json`);
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw) as AgentOutputLike;
  }
}

/** Env-driven factory used by Ch.3+ wiring. */
export function stubFromEnv(fixtureDir = 'tests/fixtures/stubs'): StubClaudeClient {
  const m = (process.env.STUB_MODE ?? 'replay') as StubMode;
  if (m !== 'live' && m !== 'record' && m !== 'replay') {
    throw new Error(`Invalid STUB_MODE: ${m}`);
  }
  return new StubClaudeClient(m, fixtureDir);
}
```

**Fixtures location.** `tests/fixtures/stubs/<hash>.json`. Per fixture: full `AgentOutputLike` shape. Existing canary fixtures (`tests/fixtures/canary-memo.md`, `tests/fixtures/rigor-cases.json`) live alongside.

**Hash key stability.** Sorted `JSON.stringify(context, Object.keys(context).sort())` ensures key-order does not break replay. Truncated to 16 hex chars for filesystem-friendly names. Collisions astronomically improbable at expected fixture counts.

---

## Section 6 — Preflight extensions (B33 + B29)

Two additions to `scripts/preflight.sh`. **Specification only** — Runtime dispatch implements the shell.

### 6.1 Dropbox / Google Drive sync detection (B33, P2)

Per R2 §Area 4 lines 199-205. Add a new section between the existing iCloud check (lines 47-55) and the customer-dashboard check (lines 64-75):

```bash
# -------- Dropbox / Google Drive sync detection (BLOCKERS B33) --------
section "Vault — other sync agents"

# Dropbox: walks ancestors of VAULT_PATH looking for a .dropbox marker file
# (Dropbox places it at every synced folder root).
DROPBOX_HIT=""
_check_dir="$VAULT_PATH"
while [ "$_check_dir" != "/" ] && [ -n "$_check_dir" ]; do
  if [ -f "$_check_dir/.dropbox" ] || [ -d "$_check_dir/.dropbox.cache" ]; then
    DROPBOX_HIT="$_check_dir"
    break
  fi
  _check_dir="$(dirname "$_check_dir")"
done
if [ -n "$DROPBOX_HIT" ]; then
  fail "Vault is inside a Dropbox-synced folder ($DROPBOX_HIT) — atomic-rename hazard (B33). Move vault out of Dropbox."
else
  green "Vault not Dropbox-synced"
fi

# Google Drive: detect via FileProvider mount path or running process.
# macOS Google Drive mounts under ~/Library/CloudStorage/GoogleDrive-* or
# legacy ~/Google Drive/. Also check for com.google.drivefs kernel extension.
if [[ "$VAULT_PATH" == *"CloudStorage/GoogleDrive"* ]] || [[ "$VAULT_PATH" == *"/Google Drive/"* ]]; then
  fail "Vault is under a Google Drive mount — atomic-rename hazard (B33). Move vault out of Google Drive."
elif kextstat 2>/dev/null | grep -q "com.google.drivefs" && [[ "$VAULT_PATH" == "$HOME"/* ]]; then
  warn "Google Drive kernel extension loaded; vault is in HOME — verify vault is NOT inside any Google Drive folder."
else
  green "Vault not Google-Drive-synced"
fi
```

### 6.2 Skill body line-count check (B29, P2)

Per `BLOCKERS.md` B29 mitigation. Add a new section after the existing extracted-skills file check (lines 78-83):

```bash
# -------- Skill body line-count check (BLOCKERS B29) --------
section "Skill body line-counts (B29 truncation detector)"

EXPECTED_OP_SKILLS=(
  "russell-voice" "run-critique" "weekly-cash-forecast" "covenant-tracker"
  "renewal-forecast" "call-intelligence" "system-check" "class-aws-connector"
)
MIN_LINES=50          # below 50 lines == truncated stub (full bodies are 100-232)
for skill in "${EXPECTED_OP_SKILLS[@]}"; do
  skill_path="$SKILLS_DIR/$skill/SKILL.md"
  if [ ! -f "$skill_path" ]; then
    fail "skill missing: $skill_path — run scripts/install-extracted-skills.py"
    continue
  fi
  lines=$(wc -l < "$skill_path" | tr -d ' ')
  if [ "$lines" -lt "$MIN_LINES" ]; then
    fail "skill $skill truncated: $lines lines < $MIN_LINES (B29). Re-run scripts/install-extracted-skills.py after the §7 fix."
  else
    green "skill $skill: $lines lines (OK)"
  fi
done
```

**Out-of-scope deferral.** Python + venv preflight check for B18 (PowerBI subprocess) is **Ch.8 / Ch.11 scope**, NOT Ch.0. This ADR does not extend preflight for Python (per advisor guidance and per OWED list scope boundary).

---

## Section 7 — Installer fix (B29 root cause)

**Root cause** (R2 §Area 8 lines 236-246). `scripts/install-extracted-skills.py` line 82-88: the regex

```python
code_block_re = re.compile(r"^```(?:markdown|yaml|md)?\s*\n(.*?)^```", re.MULTILINE | re.DOTALL)
```

uses non-greedy `.*?`. When a SKILL.md body contains an internal triple-backtick fence (e.g., a SOQL example block), the regex stops at that FIRST inner fence — truncating the skill body. The script then takes `code_blocks[0].group(1)` as the SKILL.md content, which is now the truncated prefix.

### 7.1 Rewrite specification — state-machine fence parser (NOT a regex tweak)

The fix is structural. Replace the regex-based block extractor with a state-machine parser that tracks open/closed fences with explicit depth and respects nesting. Specification for Runtime/Test dispatch:

**Function signature:**

```python
def extract_skill_body_blocks(section_text: str) -> list[dict]:
    """
    Returns ordered list of {language: str|None, content: str, start_line: int}
    for every top-level fenced code block in section_text.

    A "top-level" fence:
      - Starts with ``` at column 0 (no indentation).
      - Has an optional language tag matching [a-zA-Z0-9_-]+ immediately after.
      - Closes with ``` at column 0 on its own line.

    Inner fences (any ``` line WITHIN an open top-level block) are treated as
    LITERAL content, not as closing fences. Depth tracking is via the language
    tag presence: an opening fence with a language tag opens a new top-level
    block ONLY IF no block is currently open.
    """
```

**State-machine pseudocode:**

```
state = OUTSIDE
current_block = None
blocks = []

for line_num, line in enumerate(section_text.split('\n')):
    if state == OUTSIDE:
        if line.startswith('```'):
            # Opening fence. Capture language tag (may be empty).
            lang = line[3:].strip() or None
            current_block = {'language': lang, 'lines': [], 'start_line': line_num}
            state = INSIDE
            continue
        # else: outside any block; ignore
    elif state == INSIDE:
        # The ONLY valid closing fence: exactly '```' on its own line (no language tag,
        # no other content). Any other ``` line is treated as inner content.
        if line.rstrip() == '```':
            current_block['content'] = '\n'.join(current_block['lines']) + '\n'
            blocks.append(current_block)
            current_block = None
            state = OUTSIDE
        else:
            current_block['lines'].append(line)

# Edge case: if state == INSIDE at end (unclosed fence), raise ParseError with
# section name + start_line for diagnosis. Do NOT silently truncate.
if state == INSIDE:
    raise ValueError(f"unclosed code fence opened at line {current_block['start_line']}")

return blocks
```

**Call-site change in `install-extracted-skills.py`.** Replace the existing `code_block_re.finditer(section_text)` call (line 82) with `extract_skill_body_blocks(section_text)`. Keep the rest of the logic intact (first block → SKILL.md; subsequent blocks paired with `### Inlined reference:` headings → references).

**Why state machine over regex.** Python's `re` module does not support balanced-fence matching cleanly. The state machine is ~30 lines, deterministic, and exposes its failure mode (unclosed fence) loudly instead of silently truncating.

### 7.2 Regression test specification (verbatim per Ch.0 brief lines 78-86 — Test dispatch implements as-is)

```
For each of the 8 op-logic skills in business-planning/skills/<name>/SKILL.md:
1. Run `python3 scripts/install-extracted-skills.py`.
2. Read installed `~/.claude/skills/<name>/SKILL.md` byte count A.
3. Read full-body `business-planning/skills/<name>/SKILL.md` byte count B.
4. Assert |A - B| / B < 0.05 (within 5%).
5. Read both files' content; assert `diff(installed, full_body)` returns no semantic content differences (whitespace/install-metadata-header tolerated).
Test fails if any skill installs at <95% the full-body size.
```

Test file location: `tests/install-extracted-skills.spec.ts` (vitest, integration tier — uses real filesystem) OR `tests/install-extracted-skills.spec.py` (pytest, if the project keeps a Python test suite for installer scripts). Runtime dispatch picks the harness.

**Pre-flight requirement.** Before the test runs, it must back up + restore `~/.claude/skills/<name>/SKILL.md` for each of the 8 skills — the test mutates the user's skills directory. Use a temp-fixture install path via env var (`SKILLS_DIR_OVERRIDE`) if available; otherwise back-up + restore.

---

## Section 8 — Vault bootstrap script (B22)

`scripts/vault-bootstrap.sh` (new file — Runtime dispatch implements):

```bash
#!/bin/bash
# scripts/vault-bootstrap.sh
# Source: BLOCKERS.md B22 + docs/build-log.md §2026-05-26 OWED item #20.
#
# One-shot baseline-commit for Russell's vault git repo. Idempotent: skips the
# commit if vault git already has at least one commit.
#
# Writes the vault .gitignore (if absent) + bulk-stages everything + commits.
# Does NOT push (vault has no remote configured by default; Russell decides).

set -uo pipefail

VAULT_PATH="${VAULT_PATH:-/Users/russellteter/Documents/Claude/Projects/Business Planning}"

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$*"; }

if [ ! -d "$VAULT_PATH" ]; then
  red "Vault path missing: $VAULT_PATH"
  exit 2
fi

if [ ! -d "$VAULT_PATH/.git" ]; then
  yellow "Vault is not git-initialized; initializing..."
  git -C "$VAULT_PATH" init -q
fi

# Idempotency: skip if vault already has a commit.
if git -C "$VAULT_PATH" log --oneline -1 >/dev/null 2>&1; then
  green "Vault already has at least one commit — skipping bootstrap."
  git -C "$VAULT_PATH" log --oneline -1
  exit 0
fi

# Write .gitignore if absent. List sourced from BLOCKERS B22 mitigation +
# build-log OWED item #20.
GITIGNORE="$VAULT_PATH/.gitignore"
if [ ! -f "$GITIGNORE" ]; then
  cat > "$GITIGNORE" <<'EOF'
# C-Suite vault .gitignore — generated by scripts/vault-bootstrap.sh
.DS_Store
*.tmp-*
*.proposed-*
_extracted_skills_for_c_suite.md
**/.obsidian/workspace.json
**/.obsidian/workspaces.json
EOF
  green "Wrote .gitignore: $GITIGNORE"
fi

# Bulk stage + commit baseline.
git -C "$VAULT_PATH" add .
STAGED=$(git -C "$VAULT_PATH" diff --cached --numstat | wc -l | tr -d ' ')
SIZE=$(git -C "$VAULT_PATH" diff --cached --numstat | awk '{ a += $1; d += $2 } END { print a "+ / " d "-" }')

git -C "$VAULT_PATH" commit -q -m "vault: pre-C-Suite SafeWrite baseline"
SHA=$(git -C "$VAULT_PATH" log --oneline -1 --format=%H)

green "Bootstrap commit complete."
echo "  Files staged: $STAGED"
echo "  Size delta:   $SIZE"
echo "  Commit SHA:   $SHA"
echo
yellow "Note: vault has no remote configured. Russell sets origin if off-Mac backup is desired."
```

**Hard-gate flag.** This script touches Russell's working tree. Default behavior: idempotent + non-destructive (skips if commit already exists; writes `.gitignore` only if absent). Safe to run repeatedly. Russell may run before Ch.2 ships; Ch.0 specs the script shape; **the actual first run is at Ch.2 prep boundary** (NOT in Ch.0 — vault writes are deferred until SafeWrite-aware code is ready, per `docs/build-log.md` line 243-244).

---

## Section 9 — Acceptance criteria checklist (Audit/QA re-derives PASS/FAIL)

Each row maps a `ROADMAP.md` Ch.0 exit criterion (lines 45-52) to a testable + observable proof. **Audit/QA runs each row's command/check by hand to re-derive PASS/FAIL.**

| # | Criterion (from ROADMAP) | Test / Observation | Owner |
|---|---|---|---|
| 1 | TypeScript monorepo (Electron main + utility + renderer + shared types) | `ls apps/main/src apps/utility/src apps/renderer/src packages/shared-types/src` returns expected directories; `pnpm -r exec tsc --noEmit` exits 0 across all workspaces | Runtime |
| 2 | pnpm workspace configured | `cat pnpm-workspace.yaml` shows `apps/*` + `packages/*`; `pnpm install --frozen-lockfile` succeeds with non-empty lockfile committed; `pnpm -v` reports 10.x | Runtime |
| 3 | electron-builder configured (sign/notarize deferred to Ch.11; config shape decided now) | `cat electron-builder.yml` matches §1.4 of this ADR; `pnpm exec electron-builder --version` reports pinned major | Runtime |
| 4 | Locked Zod schemas for every vault artifact type (byte-for-byte to R0 findings) | `cat packages/shared-types/src/vault-schemas.ts` exports `PositionFrontmatter`, `DecisionFrontmatter`, `WorkstreamFrontmatterUnion`, `StakeholderFrontmatter` (union), `PreMortemFrontmatter`, `PredictionFrontmatter`, `MemoFrontmatter`, `HandoffFrontmatter`, `TripwireFrontmatter`, `CompetitorFrontmatter` — all matching §2 specs; `tests/unit/vault-schemas.spec.ts` parses one fixture per zone PASS | Test |
| 5 | `parseArtifact(rawYaml, zone)` injects type from path zone (B21) | `tests/unit/parseArtifact.spec.ts` asserts: (a) parsing a real `positions/active/POS-001-*.md` fixture succeeds with NO `type:` key in the YAML; (b) `zoneFor('/.../positions/active/POS-001.md') === 'position'`; (c) `parseArtifact` throws on missing required field | Test |
| 6 | `normalizeKeys()` middleware converts kebab → snake before Zod (B23) | `tests/unit/normalizeKeys.spec.ts` asserts `{ 'last-updated': '2026-05-26' }` → `{ last_updated: '2026-05-26' }`; recursive on nested objects + arrays; idempotent | Test |
| 7 | Typed IPC discriminated union spans main ↔ utility ↔ renderer | `cat packages/shared-types/src/ipc.ts` exports `IpcMessage` covering all 22 `kind` variants per §3; `tests/unit/ipc.spec.ts` parses one valid example of each variant PASS; `tests/unit/ipc.spec.ts` rejects a malformed payload | Test |
| 8 | CI: typecheck + lint + unit tests + integration tests green; zero live inference | `.github/workflows/ci.yml` matches §4 of this ADR; first CI run on `main` returns green; `grep -r 'STUB_MODE' .github/workflows/` shows `replay` is the CI default; no MCP/SDK auth secrets referenced in workflow | Audit/QA |
| 9 | Stub-model harness skeleton (replays canned agent outputs) | `cat packages/stub-harness/src/stub.ts` matches §5; `tests/unit/stub-harness.spec.ts` asserts replay mode loads fixture by hash key; live + record modes throw "not wired in Ch.0" | Test |
| 10 | `docs/build-log.md` Ch.0 entry written | Audit/QA reads `docs/build-log.md` and finds a Ch.0 entry following the template at the top of the file; entry cites this ADR + all acceptance rows; commit SHA + auto-push log entry verified | Audit/QA |
| 11 | Preflight extensions (Dropbox/Drive + skill-truncation) added | `./scripts/preflight.sh` runs without removing any existing checks; output contains new "Vault — other sync agents" section + "Skill body line-counts" section; failure paths tested (e.g. mock Dropbox `.dropbox` marker triggers FAIL) | Runtime |
| 12 | Installer state-machine rewrite + 95% regression test PASS | `python3 scripts/install-extracted-skills.py` re-runs successfully; for each of 8 op-logic skills `wc -l ~/.claude/skills/<name>/SKILL.md` returns ≥95% of `wc -l business-planning/skills/<name>/SKILL.md`; regression spec from §7.2 PASSES | Test |
| 13 | Vault bootstrap script specified (idempotent; SafeWrite-aware deferred to Ch.2 prep) | `cat scripts/vault-bootstrap.sh` matches §8 of this ADR; running the script in dry mode (or against an empty test vault) prints the planned `.gitignore` + planned commit message + planned baseline SHA without actually committing if `--dry-run` flag added; idempotency check (second run returns "already has commit") works | Audit/QA + Russell (Ch.2 prep boundary for first real run on his vault) |
| 14 | No live inference in CI; STUB_MODE=replay default | `grep -r 'ANTHROPIC_API_KEY\|CLAUDE_AUTH' .github/workflows/` returns empty; CI passes with no network calls to Anthropic | Audit/QA |
| 15 | Tool-version verification protocol resolved UNKNOWN entries | This ADR's §1.2 table contains no remaining `UNKNOWN` cells; each row has either a pinned major or a `[verified <date>]` annotation from Runtime dispatch's `--version` lookups at repo init | Runtime |

**Chapter close rule (per `docs/architecture/delivery.md` step 6).** Audit/QA marks PASS/FAIL per row, reproduces ≥1 row by hand (no automation), and writes the result block into the Ch.0 build-log entry. The chapter does NOT close on builder self-attestation.

---

## Section 10 — Considered alternatives

### A. Schema design — drop `type` literal vs add `type:` writes to vault

- **Option A (chosen) — `parseArtifact(rawYaml, zone)` injects type from path zone.** No vault writes; doesn't perturb 75+ existing files; reversible at any time by adding `type:` later if desired.
- **Option B — write `type:` keys to every vault file.** Rejected because: (a) DOCTRINE law #10 (safety + reversibility) — touching 75+ files for a parser convenience is destructive scope; (b) Cowork + Obsidian users do not need the key; (c) the field would need to stay in sync with directory moves manually.
- **Option C — drop schemas entirely; use unstructured `z.record()`.** Rejected: loses type-safety, defeats the purpose of Zod, hides reality from downstream code.

### B. Key naming — middleware vs migrate vault to snake_case

- **Option A (chosen) — `normalizeKeys()` middleware.** Preserves Russell's preferred kebab style in his hand-written files; one ~10-line function handles everything; idempotent on already-snake keys.
- **Option B — migrate vault to snake_case.** Rejected: same DOCTRINE law #10 reasoning; would force Obsidian users + brand-voice skills to relearn key names; reversibility is high but unnecessary work.
- **Option C — write both kebab + snake schemas as `z.union`.** Rejected: 2× schema maintenance burden; doesn't help when a single file mixes both styles.

### C. IPC validation — Zod `discriminatedUnion` vs `union` + runtime tag check

- **Option A (chosen) — Zod 4 `z.discriminatedUnion('kind', [...])`.** Performance per Zod 4 release notes (100x reduction in TSC instantiations on nested unions); compiler narrows correctly on `msg.kind` checks; rejects malformed payloads at parse time.
- **Option B — plain `z.union` + manual switch.** Rejected: O(n) parse complexity instead of O(1) dispatch; more verbose runtime errors; loses TypeScript discriminated-union narrowing benefits.

### D. CI runner — Ubuntu vs macOS

- **Option A (chosen) — `ubuntu-latest`.** Per `docs/architecture/delivery.md` line 194; cheaper, faster, sufficient for typecheck + lint + vitest. Sign/notarize requires macOS but runs locally on Russell's Mac at Ch.11.
- **Option B — `macos-latest`.** Rejected: 10× cost on GHA; nothing in the CI matrix actually requires Darwin until Ch.11 packaging.

### E. Installer fix — regex tweak vs state-machine rewrite

- **Option A (chosen) — state-machine parser.** Per R2 §Area 8 root cause analysis. Deterministic; exposes failure mode (unclosed fence) explicitly; ~30 lines.
- **Option B — tighter regex with backreferences.** Rejected: Python's `re` module lacks reliable balanced-pattern matching; previous attempt failed; would mask future failures the same way.
- **Option C — markdown-it parser dependency.** Rejected: adds a dependency for ~5 lines of replaced logic; markdown-it is overkill for fence extraction.

### F. Electron + electron-builder + Zod version pinning — exact pin vs floating major

- **Option A (chosen) — pin major; lockfile pins exact patch.** Allows security patches in (`^x.y.z`) while preventing API breakage between majors. CI's `--frozen-lockfile` enforces deterministic builds.
- **Option B — pin exact patch version.** Rejected: requires manual bumps for security fixes; doesn't scale across chapters.
- **Option C — leave floating (`*`).** Rejected: violates `~/.claude/rules/commit-lockfile-with-manifest.md`; introduces drift between dev + CI builds.

---

## Section 11 — DOCTRINE amendment (Proposed for Russell ratification — NOT applied)

> **NOT APPLIED.** Per DOCTRINE §Amendment process: "Apply on the next chapter boundary (not mid-chapter)" and "No silent doctrine changes." This section surfaces only.

**Proposal — amend DOCTRINE law #1 (Truth over the appearance of completion) with a corollary.** Source: `docs/build-log.md` §2026-05-26 — Phase R complete §"Doctrine amendments proposed" (lines 359-362).

**Proposed corollary text:**

> Every architecture-spec claim about external reality (API endpoint, library behavior, vault schema, OS version, version pin) MUST carry a verifier tag in the form `[<source> verified <YYYY-MM-DD>]`. Unverified claims must carry `🔍 <PHASE> VERIFY:` marker. Verifier tags are stripped or added by Phase R + per-chapter Audit/QA, never silently.

**Rationale for the proposal.** Phase R surfaced **7+ instances** where seeded architecture-spec claims diverged from on-disk reality (R0-Vault: every vault Zod schema mismatched real frontmatter; macOS version error "Sequoia 14.4+" vs real 15.x; CRO frame stage labels S4/S5 don't exist; covenant thresholds ASSUMED; etc.). Per DOCTRINE law #8 (codify after 3 repeat issues), the threshold is met. The corollary makes the pattern enforceable in Audit/QA.

**Ratification path.** Russell may ratify at the Ch.0/Ch.1 boundary by editing `DOCTRINE.md` directly and committing with message `doctrine: amend law N to address spec-reality drift`. The post-commit hook auto-pushes. Auto-mode does NOT apply.

**Consequences if ratified.**
- Every architecture-spec doc in `docs/architecture/*.md` needs a one-time tagging pass during Ch.1 prep.
- New patches to architecture specs from any future chapter inherit the tagging discipline by default.
- Audit/QA gains a structural-grep check ("flag long uncited paragraphs about external reality" already exists in DOCTRINE law #4 enforcement).

---

## Consequences

### Positive

- **Vault reads do not silently fail.** Every artifact type has a verified schema; `parseArtifact` + `normalizeKeys` handle both name styles + injected type discriminator.
- **CI gives Runtime/Test dispatches a green target the moment they merge correctly.** STUB_MODE=replay + frozen lockfile + node 22 + pnpm 10 + electron-builder pinned.
- **IPC contract is fully enumerated** — no `// ... (all variants from runtime.md)` ellipsis. Runtime, Test, and Front-end all code to the same 22-variant union.
- **Skill installer bug fixed at the root.** Future scheduler invocations of skill bodies see full-body content; the regression test ensures it stays that way.
- **Preflight refuses to run with hidden sync hazards.** Dropbox + Google Drive joined iCloud in the detector.
- **Vault bootstrap script is ready to fire at Ch.2 prep** — SafeWrite has a non-empty git history to commit against from day one.

### Negative / costs

- **Schema changes vs `docs/architecture/data.md`.** This ADR supersedes the schemas in `data.md` §Zod schemas (lines 33-202). `data.md` should be updated to point readers here, OR replaced in the same commit that lands this ADR (see Follow-up work).
- **`parseArtifact` adds a small indirection.** Every vault read goes through one function. Performance-acceptable (no perf hot path on a few hundred files).
- **State-machine parser is ~30 lines of Python instead of one regex.** Maintenance load is small; documentation in the file itself addresses understandability.
- **Tool-version UNKNOWN entries** remain in §1.2 until repo init resolves them. Runtime dispatch must close these before CI runs.

### Follow-up work

1. **`docs/architecture/data.md` update** — replace schemas with pointers to this ADR (or in-line the corrected schemas from §2). Owner: Ch.1 architect during the per-chapter ritual SPEC step.
2. **Update `docs/architecture/runtime.md`** with the Decision 5 error-handling table, B34 heartbeat-only relay constraint, and SQLite `userData` path note (OWED items 2-4). Owner: Ch.1 architect.
3. **Update `docs/architecture/prompts.md`** with NAMED_ENTITY_REGISTRY requirement, per-playbook precondition matrix, verbatim lens prompts (with CRO stage-label correction), voice-rule drops, Run-Critic rubric (OWED items 5-9). Owner: Ch.4 architect.
4. **Update `docs/architecture/ui.md`** with plan-approval per-playbook table + cost-meter three-surface rule (OWED items 10-11). Owner: Ch.5 architect.
5. **Update `docs/architecture/mcp.md`** with R1-Remaining patches 1-2, 9, 11 (OWED items 12-13). Owner: Ch.8 architect.
6. **Update `docs/architecture/delivery.md`** with daemon edge cases (Decision 7) + notarization pipeline + Sequoia 15.x rename + electron-rebuild in CI build step (OWED items 14-15). Owner: Ch.10 architect (daemon) + Ch.11 architect (notarization).
7. **Resolve B25 + B28 + B32** with Russell at next session (decision recovery + mirror policy + Bases vs Dataview).
8. **B30 (ruvector.db schema)** — Ch.3 architect investigates before declaring fresh SQLite store.
9. **B31 (globalShortcut)** — Ch.5 UX implements `isRegistered()` check + user-configurable fallback.

### Reversibility

**High.** Each contract is a single file in `packages/shared-types/` or a single shell script. Reversing the `parseArtifact(zone)` decision and adding `type:` keys to vault files is a one-script migration. Reversing the IPC union is a search-replace across receivers. Reversing version pins is `pnpm up`.

### Tripwires (what would tell us this decision was wrong)

- **Vault parser fails on a real artifact-type file Phase R didn't touch.** → Re-run R0-Vault on the new directory; update `zoneFor` + add schema.
- **CI flakes on `pnpm install --frozen-lockfile`.** → Verify lockfile committed; verify `packageManager` field present; check pnpm major mismatch.
- **`extract_skill_body_blocks` raises ParseError on a future skill.** → Surface the unclosed fence; fix the source `_extracted_skills_for_c_suite.md`.
- **Vault bootstrap commit produces 10K-file commit.** → Check `.gitignore` was generated correctly; add patterns for any new junk.

---

## Affected artifacts

- `docs/architecture/data.md` — supersedes §Zod schemas (lines 33-202); follow-up update at Ch.1.
- `docs/architecture/delivery.md` — repo tree (lines 75-150) gets `parseArtifact.ts`, `normalizeKeys.ts`, `vault-bootstrap.sh` additions; notarization pipeline update deferred to Ch.10/Ch.11.
- `docs/architecture/runtime.md` — IPC kind enumeration (lines 44-63) now codified in §3 of this ADR; follow-up at Ch.1.
- `packages/shared-types/src/vault-schemas.ts` — NEW, owned by §2.
- `packages/shared-types/src/parseArtifact.ts` — NEW, owned by §2.
- `packages/shared-types/src/normalizeKeys.ts` — NEW, owned by §2.
- `packages/shared-types/src/ipc.ts` — NEW, owned by §3.
- `packages/stub-harness/src/stub.ts` — NEW, owned by §5.
- `.github/workflows/ci.yml` — NEW, owned by §4.
- `scripts/preflight.sh` — UPDATE (additions per §6).
- `scripts/install-extracted-skills.py` — REWRITE (state-machine parser per §7).
- `scripts/vault-bootstrap.sh` — NEW, owned by §8.
- `BLOCKERS.md` — entries B21, B22, B23, B24, B26, B27, B29, B33 receive `MITIGATED` status after Audit/QA closes Ch.0.
- Related ADRs: ADR-0000-doc-set-scaffold.md (Phase R close; this ADR is its first chapter follow-up).

---

**Reviewed by Audit/QA in chapter ritual step 6:** _<pending — to be filled by Audit/QA dispatch after Runtime + Test land their implementations>_

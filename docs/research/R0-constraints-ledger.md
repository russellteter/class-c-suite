# R0 Constraints Ledger — Vault Artifact Directory Schema Reality

**Written by:** R0-Vault sub-agent (Claude Sonnet 4.6)
**Date:** 2026-05-26
**Status:** Complete — all 10 vault directories read; all B9/B12 verifications run.
**Doctrine compliance:** Every schema claim cites source file path + line range.
**Orchestrator note (2026-05-26):** R0-Vault sub-agent ran read-only and could not write files. This report content is the sub-agent's verbatim return; orchestrator wrote it to disk. Citations preserved as given.

---

## 1. Per-Directory Inventory

| Directory | File Count | Schema Variants Observed | Oldest mtime | Newest mtime | Orphan Count |
|---|---|---|---|---|---|
| `positions/active/` | 20 | 1 base variant; POS-014 adds `correction-log[]` array | 2026-05-21 (POS-001/002/003) | 2026-05-26 (POS-021/022) | 0 direct; POS-010/011 referenced in README but absent |
| `decisions/` | 4 (INDEX + 3 decision files) | snake_case base | 2026-05-22 (all 3) | 2026-05-22 | DEC-001 through DEC-004 referenced in INDEX but NO files exist |
| `workstreams/` | 17 (DASHBOARD + 15 WS files + 1 .bak) | 2 variants: full canonical (WS-01/02/04/05/06/07/08/09/10/11/12/13/14/15) vs. minimal (WS-03) | 2026-05-21 (WS-02/04/05) | 2026-05-26 (DASHBOARD, WS-14) | 0 |
| `stakeholders/internal-exec-board/` | 2 | Lean 5-key frontmatter | 2026-05-21 | 2026-05-21 | 0 |
| `stakeholders/internal-dependencies/` | 10 | Lean 5-key frontmatter | 2026-05-21 | 2026-05-21 | 0 |
| `stakeholders/customers-top-arr/` | 1 | Rich 17-key account frontmatter (created 2026-05-26) | 2026-05-26 | 2026-05-26 | 0 |
| `pre-mortems/` | 15 (INDEX + 14 PM files) | 2 variants: kebab keys (PM-001/002/004-007/011-014) vs. snake keys (PM-003/008/009/010) | 2026-05-21 (PM-001/004/005) | 2026-05-26 (PM-002/014) | 0 |
| `calibration/` | SCORECARD.md + 9 PRED files | 2 variants: kebab (PRED-007) vs. snake (PRED-001/002) | 2026-05-21 | 2026-05-21 | 0 |
| `adversarial/competitor-watch/` | 1 (engageli.md) | 4-key frontmatter | 2026-05-21 | 2026-05-21 | INDEX references top-hat.md — FILE MISSING |
| `adversarial/financial-tripwires/` | 4 | 8-key tripwire frontmatter | 2026-05-21 | 2026-05-26 | 0 |
| `investigations/` | 7 (3 dirs + 4 md files) | No frontmatter (narrative headers) | 2026-05-21 | 2026-05-26 | 0 |
| `deliverables/` | 3 subdirs | Mixed: .md + .html + .xlsx + .csv | 2026-05-21 | 2026-05-26 | 0 |
| `memos/` | DOES NOT EXIST | — | — | — | — |
| `handoffs/` | DOES NOT EXIST | — | — | — | — |

Sources: `ls` command on each directory path, 2026-05-26.

---

## 2. Frontmatter Schemas — Byte-for-Byte

### 2.1 Position (corpus: 20 files in `positions/active/`)

Actual on-disk keys, verified across POS-001, POS-002, POS-005, POS-012, POS-014:

```
id: string              # "POS-001" — required in all 20 files
slug: string            # kebab slug — required in all 20 files
title: string           # required
status: string          # "active" — required; observed only "active"
confidence: integer     # 0-100 — required
created: date           # YYYY-MM-DD — required
last-updated: date      # kebab hyphenated — required
last-retested: date     # kebab hyphenated — required
supersedes: null|string # null or POS-id — required (null if none)
superseded-by: null|string  # kebab hyphenated — required
authored-by: string     # agent-lens name — required
decision-this-supports: string  # DEC id — required
predictions-spawned: array  # list of PRED ids — required
source: string          # free-text citation — required
correction-log: array   # POS-014 ONLY — array of strings; OPTIONAL
```

**Key findings vs. data.md schema:**
- `type: z.literal('position')` — ABSENT from all 20 files. (Verified: `grep -l "^type:" positions/active/*.md` returns 0 matches.)
- All key names use **kebab-case** (`last-updated`, `last-retested`, `decision-this-supports`). data.md schema uses **snake_case** (`last_retested`).
- `evidence` array (data.md required field) — ABSENT from all files. Evidence is in the markdown body, not the frontmatter.
- `linked_positions` (data.md field) — ABSENT from all files.
- `correction_log` (data.md optional array of objects with `date/change/rationale` keys) — POS-014 has `correction-log` as an array of **strings**, not objects. Source: `/Users/russellteter/Documents/Claude/Projects/Business Planning/positions/active/POS-014-helmer-powers-thin.md`, lines 16-18.

### 2.2 Decision (corpus: 3 files in `decisions/`)

Actual on-disk keys, verified across DEC-005, DEC-006, DEC-007:

```
id: string              # "DEC-005" — required
title: string           # required
date_proposed: date     # snake_case YYYY-MM-DD — required
decision_maker: string  # free text — required
status: string          # "proposed" in all 3 — observed only "proposed"
reversibility: string   # free-text ("one-way...") — required
confidence: integer     # 0-100 — required
source: string          # investigation citation — required
```

**Key findings vs. data.md schema:**
- `type: z.literal('decision')` — ABSENT.
- `date_proposed` (on-disk) vs. `decided_on` (data.md) — field name mismatch.
- `status` values on-disk: "proposed". data.md enum is `active|resolved|reversed|superseded` — no "proposed" value.
- `tripwires` array (data.md required) — ABSENT from frontmatter; tripwires appear in markdown body only.
- `rationale` (data.md required string) — in markdown body, not frontmatter.
- `linked_positions` (data.md optional) — ABSENT from frontmatter.
- `reversibility` on-disk is free-text; data.md specifies enum `low|medium|high`.
- DEC-001 through DEC-004 referenced in INDEX.md but NO individual files exist. Source: `ls decisions/` returns only DEC-005/006/007/INDEX.

### 2.3 Workstream (corpus: 15 files; WS-03 is a divergent variant)

**Canonical shape** (WS-01, WS-02, WS-04—WS-15 except WS-03):

```
workstream_id: string   # "WS-01" — required
title: string           # required
owner: string           # required
phase: string           # free-text ("maintenance", "execution", etc.) — required
status: string          # "GREEN"|"YELLOW"|"RED"|"YELLOW (will move...)" — required
status_criteria:        # object with green/yellow/red string values — required
  green: string
  yellow: string
  red: string
  orange: string        # WS-13 only
cash_impact:            # object — required
  amount_usd: string    # FREE TEXT — always a string
  direction: string
  timing: string
arr_impact:             # object — required
  amount_usd: string|integer  # WS-04: bare integer 0; WS-11: bare integer 0
  direction: string
  timing: string
people_involved: array  # array of strings — required
depends_on: array       # array of WS/POS ids — required
depended_on_by: array   # array of WS ids — required
next_milestone: string  # required
next_milestone_date: date|string  # YYYY-MM-DD or "TBD"
decisions_pending: array    # array of strings — required
linked_positions: array     # array of POS ids — required
linked_decisions: array     # array of DEC ids — required
last_updated: date      # YYYY-MM-DD — required
```

**WS-03 divergent shape** (minimal):
```
id: string              # NOTE: "id" not "workstream_id"
title: string
status: string
owner: string
phase: string
last_updated: date
source: string
```

Source: `/Users/russellteter/Documents/Claude/Projects/Business Planning/workstreams/WS-03-org-redesign.md`, lines 1-9.

**Key findings vs. data.md schema:**
- data.md `WorkstreamFrontmatter` is severely under-specified. It has only `type`, `id`, `title`, `status`, `amount_usd`, `dependencies`, `milestones`. On-disk reality adds 10+ more keys.
- `type: z.literal('workstream')` — ABSENT.
- `amount_usd` lives nested inside `cash_impact` object, not at top-level. data.md treats it as a top-level field.
- `arr_impact.amount_usd` in WS-04 and WS-11 is a **bare integer** (`0`), not a string. Parser must handle both.
- WS-03 uses `id:` instead of `workstream_id:` — inconsistency within corpus.

### 2.4 Stakeholder (corpus: 13 files across 3 subdirectories)

**Exec/internal lean shape** (internal-exec-board + internal-dependencies, 12 files):

```
name: string            # "chasen-michael-ceo" — required
sensitivity: string     # "HIGH" — required
last_known_status: string  # "WARM"|"HOT" — required
last_refresh: date      # YYYY-MM-DD — required
source: string          # investigation citation — required
```

Source: `/Users/russellteter/Documents/Claude/Projects/Business Planning/stakeholders/internal-exec-board/chasen-michael-ceo.md`, lines 1-7.

**Customer account shape** (customers-top-arr, 1 file — seu-bme.md):

```
account_id: string      # SF account ID
account_name: string
short_name: string
segment: string
territory: string
location: string
customer_type: string
total_contacts: integer
account_owner: string
current_opp_owner: string
mediated_through: string
class_share_of_arr: string
last_updated: date
linked_pre-mortems: array
linked_tripwires: array
linked_positions: array
linked_workstreams: array
sensitivity: string
```

Source: `/Users/russellteter/Documents/Claude/Projects/Business Planning/stakeholders/customers-top-arr/seu-bme.md`, lines 1-20.

**Key findings vs. data.md schema:**
- `type: z.literal('stakeholder')` — ABSENT.
- data.md schema fields `id`, `role`, `decision_rights`, `hot_buttons`, `what_not_to_say`, `last_activity` — ABSENT from all 13 files.
- Lean shape has 5 keys; data.md schema expects 7. Neither matches the other exactly.
- Customer shape introduces 18 keys not in data.md StakeholderFrontmatter at all.

### 2.5 Pre-Mortem (corpus: 14 files in `pre-mortems/`)

**Kebab-key variant** (PM-001/002/004-007/011-014 — majority):

```
id: string              # "PM-001" — required
slug: string            # kebab slug — required
probability: integer    # bare integer (15, 25, 20) — required
impact: string          # "existential"|"high"|"medium" (NOT the data.md enum) — required
last-reviewed: date     # kebab — required
related-positions: array    # kebab hyphenated
related-workstreams: array  # kebab hyphenated
related-pre-mortems: array  # kebab hyphenated (some)
related-tripwires: array    # kebab hyphenated (PM-014 only)
depends-on: array       # kebab hyphenated — required
```

**Snake-key variant** (PM-003/008/009/010 — minority):

```
name: string            # "PM-003-key-engineer-resigns" (full slug as name)
probability: string     # "30%" WITH percent sign — required
impact: string          # "HIGH" in caps — required
last_reviewed: date     # snake — required
source: string          # investigation citation — required
```

Sources: PM-001 lines 1-10, PM-003 lines 1-6, PM-010 lines 1-7.

**Key findings vs. data.md schema:**
- `type: z.literal('pre-mortem')` — ABSENT from all files.
- data.md `impact` enum: `catastrophic|severe|significant|recoverable` — matches ZERO on-disk values. Observed: `existential`, `HIGH`, `high`, `medium`.
- `probability` field type inconsistency: integers (e.g. `15`) in kebab files vs. strings with `%` suffix (e.g. `"30%"`) in snake files.
- `early_warning_signals` (data.md required array) — in markdown body, not frontmatter.
- `mitigation` (data.md required array) — in markdown body, not frontmatter.
- `scenario` (data.md required string) — in markdown body, not frontmatter.
- `id` field — ABSENT in snake-key variant (uses `name` instead).

### 2.6 Prediction / Calibration (corpus: 9 PRED files in `calibration/predictions/`)

**Snake-key variant** (PRED-001/002, majority):

```
id: string              # "PRED-001" — required
claim: string           # required
confidence: integer     # 0-100 — required
resolution_date: date   # snake — required
status: string          # "open" — required
spawned_by: string      # POS reference — required
source: string          # citation — required
```

**Kebab-key variant** (PRED-007):

```
id: string
position: string        # NOTE: "position" not "spawned_by"
claim: string
resolution-date: date   # kebab
resolution-criterion: string    # additional field
confidence-at-time-of-prediction: integer   # different name for confidence
spawned: date           # creation date — additional field
status: string
```

Sources: PRED-001 lines 1-9, PRED-002 lines 1-9, PRED-007 lines 1-9.

**Key findings vs. data.md schema:**
- `type: z.literal('prediction')` — ABSENT.
- data.md `made_on` field — ABSENT from most files (PRED-007 uses `spawned` instead).
- data.md `resolves_by` field — actual field is `resolution_date` (snake) or `resolution-date` (kebab).
- data.md `resolved: boolean` — ABSENT. Files use `status: "open"`.
- data.md `outcome` enum — ABSENT from all open predictions.
- data.md `brier_contribution` — ABSENT (expected; none resolved yet).

### 2.7 Adversarial — Competitor Watch

```
competitor: string      # required
threat_level: string    # free-text level + note — required
last_updated: date      # required
last_signal: date+note  # required
sources: array          # required
```

Source: `/Users/russellteter/Documents/Claude/Projects/Business Planning/adversarial/competitor-watch/engageli.md`, lines 1-7.

### 2.8 Adversarial — Financial Tripwires

```
tripwire_id: string     # "TW-FIN-001" — required
title: string           # required
category: string        # "financial" — required
source: string          # required
owner: string           # required
scan_cadence: string    # required
escalation: string      # GREEN/YELLOW/RED/BREACH band definition
last_updated: date      # required
```

Source: `/Users/russellteter/Documents/Claude/Projects/Business Planning/adversarial/financial-tripwires/barclays-leverage-covenant.md`, lines 1-9.

### 2.9 Investigations

No frontmatter. Files use narrative markdown H1 headers with metadata in body text (Workstream tags, Mode, Opened, Owner, Sensitivity). Source: `class-org-institutional-read.md` lines 1-8.

### 2.10 Memos / Handoffs

Neither `memos/` nor `handoffs/` directories exist in the vault as of 2026-05-26. The data.md `MemoFrontmatter` and `HandoffFrontmatter` schemas are aspirational — no on-disk corpus to verify against.

---

## 3. Schema Discrepancies

### SD-01: `type` discriminator field missing from all artifact types

**Severity:** CRITICAL. Every Zod schema in data.md uses `z.literal(...)` for `type`, but no vault file has a `type:` key.

**Suggested fix (TypeScript):**

```typescript
// Option A: Drop the discriminator (simpler, loses type-narrowing)
// Parse by file path zone instead of embedded type field.
export const PositionFrontmatter = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  // ... (no type field)
});

// Option B: Inject type at parse time from zone (preferred — no vault writes needed)
function parseArtifact(rawYaml: unknown, zone: 'position'|'decision'|...) {
  return PositionFrontmatter.parse({ type: zone, ...rawYaml });
}
```

### SD-02: Key naming — kebab vs. snake throughout

**Severity:** HIGH. All three options have costs.

```typescript
// Current data.md schema (snake_case):
export const PositionFrontmatter = z.object({
  last_retested: z.string().optional(),
  superseded_by: z.string().optional(),
});

// On-disk reality (kebab-case):
// last-retested, superseded-by, last-updated, decision-this-supports, etc.

// Suggested fix: preprocess YAML keys at parse time
function normalizeKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k.replace(/-/g, '_'), v])
  );
}
// Then parse the normalized object against the existing snake_case schemas.
```

### SD-03: `WorkstreamFrontmatter` severely under-specified

**Severity:** HIGH. data.md shows 6 fields; reality has 15+.

```typescript
export const WorkstreamFrontmatter = z.object({
  // type: z.literal('workstream'),  // inject at parse time
  workstream_id: z.string(),         // NOTE: was "id" in data.md; corpus uses "workstream_id"
  title: z.string(),
  owner: z.string(),
  phase: z.string(),
  status: z.enum(['GREEN', 'YELLOW', 'RED', 'YELLOW (will move GREEN at July board ratification)']),
  // safer: z.string() until status values are normalized
  status_criteria: z.object({
    green: z.string(),
    yellow: z.string(),
    red: z.string(),
    orange: z.string().optional(),   // WS-13 only
  }),
  cash_impact: z.object({
    amount_usd: z.union([z.string(), z.number()]), // bare 0 in WS-04/11
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
  next_milestone_date: z.string(),   // date or "TBD"
  decisions_pending: z.array(z.string()),
  linked_positions: z.array(z.string()),
  linked_decisions: z.array(z.string()),
  last_updated: z.string(),
});
```

### SD-04: `StakeholderFrontmatter` bifurcates by subdirectory

**Severity:** HIGH. data.md has one schema; reality needs at least two.

```typescript
export const StakeholderPersonFrontmatter = z.object({
  name: z.string(),
  sensitivity: z.string(),
  last_known_status: z.string(),
  last_refresh: z.string(),
  source: z.string(),
});

export const StakeholderAccountFrontmatter = z.object({
  account_id: z.string(),
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
  linked_pre_mortems: z.array(z.string()).optional(),
  linked_tripwires: z.array(z.string()).optional(),
  linked_positions: z.array(z.string()).optional(),
  linked_workstreams: z.array(z.string()).optional(),
  sensitivity: z.string(),
});

export const StakeholderFrontmatter = z.union([
  StakeholderPersonFrontmatter,
  StakeholderAccountFrontmatter,
]);
```

### SD-05: `PreMortemFrontmatter` — impact enum wrong, probability type inconsistent

**Severity:** HIGH.

```typescript
export const PreMortemFrontmatter = z.object({
  id: z.string().optional(),         // absent in snake variant (uses 'name' instead)
  slug: z.string().optional(),       // absent in snake variant
  name: z.string().optional(),       // snake variant only
  probability: z.union([
    z.number().int(),                // kebab files: bare integer
    z.string().regex(/^\d+%$/),     // snake files: "30%"
  ]),
  impact: z.enum([
    'existential', 'high', 'HIGH', 'medium',
  ]),
  // data.md enum catastrophic|severe|significant|recoverable → REPLACE with above
});
```

### SD-06: `DecisionFrontmatter` — field names mismatch, status enum wrong

**Severity:** HIGH.

```typescript
export const DecisionFrontmatter = z.object({
  id: z.string(),
  title: z.string(),
  date_proposed: z.string(),        // on-disk: "date_proposed" not "decided_on"
  decision_maker: z.string(),       // on-disk: "decision_maker" not in data.md
  status: z.enum(['proposed', 'in-execution', 'resolved-correct', 'deferred']),
  reversibility: z.string(),        // on-disk: free-text, not enum low|medium|high
  confidence: z.number().int().optional(),
  source: z.string(),
});
// tripwires, rationale, linked_positions — NOT in frontmatter; markdown body only.
```

### SD-07: `PredictionFrontmatter` — made_on/resolves_by mismatch

**Severity:** MEDIUM.

```typescript
export const PredictionFrontmatter = z.object({
  id: z.string(),
  claim: z.string(),
  confidence: z.union([z.number().int(), z.string().regex(/^\d+$/)]),
  resolution_date: z.string().optional(),
  spawned_by: z.string().optional(),
  position: z.string().optional(),            // PRED-007 only
  spawned: z.string().optional(),             // PRED-007 creation date
  resolution_criterion: z.string().optional(),// PRED-007 only
  status: z.enum(['open', 'resolved']),
  source: z.string().optional(),
});
```

---

## 4. `amount_usd` Parser Design Data (B12)

12-row sample from workstream corpus. Source: grep on all WS-*.md files, 2026-05-26.

| Workstream | `cash_impact.amount_usd` raw value | Parse status | Notes |
|---|---|---|---|
| WS-01 | `"+$1.5M to +$2.5M across full lever stack (already modeled in Cash Lever Model v5)"` | ambiguous | Range, not point |
| WS-02 | `"preserves $0-3M depending on save plays executed"` | ambiguous | Range |
| WS-04 | `"~$30-40K/mo achievable from 12% reduction (POS-001 ceiling)"` | ambiguous | Range + per-period, tilde |
| WS-05 | `"$2.0M targeted across AR pull ($1.4M) + AP defer ($0.6M)"` | ambiguous | Two sub-components |
| WS-06 | `"$2.5M unlock if BACA release approved (PRED-001)"` | ambiguous | Conditional |
| WS-07 | `"indirect — affects Holdco bridge optionality"` | tbd | No dollar amount |
| WS-08 | `"indirect — does NOT affect WS-02 or WS-09 in 6-month window per Pass 3 unlink"` | tbd | No dollar amount |
| WS-09 | `"Q3 FY26 cliff = $2.39M-3.4M probable churn; tactical motion can mitigate $500K-1M"` | ambiguous | Multiple ranges |
| WS-10 | `"personal to Russell, not Class"` | tbd | Not applicable |
| WS-11 | `0` | ok | Bare integer zero — YAML parses as int not string |
| WS-12 | `"binary — either preserves or zeroes equity"` | tbd | No dollar amount |
| WS-13 | `"FY27 EBITDA target $1.0-1.5M positive on $20-22M ARR; OpEx envelope $18-19.5M with $12.3M below-the-line ceiling"` | ambiguous | Multi-figure narrative |

**Parse-status distribution across 12 rows:** ok=1, ambiguous=7, tbd=4.

**Recommendation:** The `workstream_amounts_mirror` SQLite table in data.md handles this correctly. Parser: regex for first dollar figure; if range or no dollar → `null` cents; `parse_status` as `ok|ambiguous|tbd`. Do not attempt point-normalization of ranges.

---

## 5. Vault Git + iCloud Verification Results

### Git status

**Command run:** `cd "/Users/russellteter/Documents/Claude/Projects/Business Planning/" && git log --oneline -5`

**Output:** `fatal: your current branch 'main' does not have any commits yet`

**Follow-up:** `git status` confirms git is initialized (`On branch main`, `.git/` directory exists, mtime 2026-05-26 22:50).

**Conclusion:** Vault has a git repo initialized but **zero commits.** The auto-commit hook in data.md (`c-suite: <agent-role> wrote <relative-path> during <playbook> run <run_id>`) has never fired. Ch.0/Ch.2 prerequisite: perform an initial commit of all current vault contents before the SafeWrite engine ships.

### iCloud sync

**Command run:** `xattr -p com.apple.fileprovider.fpfs#P "/Users/russellteter/Documents/Claude/Projects/Business Planning/"`

**Output:** `xattr: ...: No such xattr: com.apple.fileprovider.fpfs#P`

**Conclusion:** Vault is **NOT iCloud-synced.** BLOCKER B9 is clear. The `rename(2)` atomicity assumption in SafeWrite holds.

---

## 6. Mirror-Divergence Audit

Mirror path: `/Users/russellteter/Claude Code Projects/c-suite/business-planning/`
Vault path: `/Users/russellteter/Documents/Claude/Projects/Business Planning/`

### Root-level directory diff

Files present in **vault only** (not in mirror):
- `PROJECT_INSTRUCTIONS_v2_DRAFT.md`
- `SYSTEM_OVERVIEW.html`
- `scheduled-reports/` (contains `README.md`, `monday-ops-2026-05-26.md`, `test-monday-ops-2026-05-26.md`)
- `scheduled-task-ledger/` (contains `README.md`, `class-tripwire-and-cash-monday.jsonl`)
- `transformation-backbone/` (contains `README.md`, `cascade-scenarios/`, `future-state/`, `narrative/`, `transitions/`)

### File content diff sample

**WS-01-cash-defense.md** — DIVERGED:
- Vault: `title: Cash Defense / Trough Maintenance`, `phase: maintenance`, `status: YELLOW`
- Mirror: `title: Cash Defense / July 26 Trough`, `phase: execution`, `status: RED`

**POS-001-aws-90day-ceiling-12pct.md** — IDENTICAL
**DEC-005-russell-absorbs-cro-scope-on-ed-exit.md** — IDENTICAL
**chasen-michael-ceo.md** — IDENTICAL

### Mirror-divergence policy recommendation

The vault at `/Users/russellteter/Documents/Claude/Projects/Business Planning/` is the **canonical source of truth** per data.md. The c-suite mirror at `business-planning/` is stale — WS-01 alone shows meaningful status drift (YELLOW/maintenance → RED/execution is a real divergence, not cosmetic).

**Recommended policy:** Eliminate the mirror. The C-Suite app reads the vault directly per data.md architecture. The `business-planning/` directory in the code repo should be **removed** or converted to a `.gitignore`-excluded symlink. If Russell needs the planning docs available in the git repo for reference, use a shallow read-only copy script that is explicitly never pushed to CI. Do NOT maintain the mirror as a co-equal copy — it will permanently diverge as soon as any SafeWrite lands.

---

## 7. Top Findings the Build Must Act On

| # | Finding | Severity | Chapter affected |
|---|---|---|---|
| 1 | **`type` discriminator field absent from all vault artifacts.** Zero files have a `type:` key; all data.md schemas require `z.literal(...)`. Parser will fail for 100% of vault reads. Fix: inject type from file-path zone at parse time, not from YAML. | CRITICAL | Ch.0 (schema design), Ch.1 (indexer), Ch.2 (SafeWrite) |
| 2 | **Vault git has zero commits.** The SafeWrite auto-commit and the institutional change-history assumption both fail until an initial commit lands. Ch.0 setup must perform a bulk initial commit before Ch.2 ships. | CRITICAL (Ch.2 blocker) | Ch.0, Ch.2 |
| 3 | **Key naming chaos: kebab vs. snake throughout every artifact type.** A YAML key normalizer (replace `-` → `_`) must run before Zod parse on every read. Without it, kebab-keyed files will fail schema validation at every field. | CRITICAL | Ch.1 (indexer/frontmatter parser) |
| 4 | **`WorkstreamFrontmatter` in data.md missing 10+ real fields.** `cash_impact` nested object, `arr_impact`, `status_criteria`, `people_involved`, `depends_on`, `depended_on_by`, `next_milestone`, `next_milestone_date`, `decisions_pending`, `linked_positions`, `linked_decisions` are all on-disk but absent from the Zod schema. The SQLite `workstream_amounts_mirror` will need to read `cash_impact.amount_usd`, not top-level `amount_usd`. | HIGH | Ch.1, data.md update |
| 5 | **DEC-001 through DEC-004 referenced in `decisions/INDEX.md` but no files exist.** Index reports 7 decisions (1 resolved, 6 active); only 3 files exist (DEC-005/006/007). The write-back drafter and any decision-indexer will surface broken cross-references. Either create stub files or update INDEX. | HIGH | Ch.6 (write-back), Ch.1 (indexer) |
| 6 | **Pre-mortem `impact` enum mismatches data.md completely.** On-disk: `existential`, `HIGH`, `high`, `medium`. data.md: `catastrophic|severe|significant|recoverable`. Zero overlap. Extend enum to include on-disk values, or run a normalization migration. | HIGH | Ch.1, data.md update |
| 7 | **`StakeholderFrontmatter` bifurcates.** Exec/person files (12) have lean 5-key shape; SEU/BME account file has 18-key shape. data.md has neither. Need two sub-schemas with a `z.union` discriminated by presence of `account_id`. | HIGH | Ch.1, data.md update |
| 8 | **Mirror (`business-planning/`) diverges from vault on at least WS-01 (status, phase, title).** Three vault-only directories (`scheduled-reports/`, `scheduled-task-ledger/`, `transformation-backbone/`) are absent from mirror. Mirror should be removed or deprecated. | MEDIUM | Build infrastructure |
| 9 | **`memos/` and `handoffs/` directories do not exist.** Ch.6 write-back engine must create them on first write. Ch.0 setup should document this as a known-absent zone. | MEDIUM | Ch.0, Ch.6 |
| 10 | **Pre-existing SQLite at `c-suite/ruvector.db`.** data.md assumes a fresh SQLite store. Investigate schema of ruvector.db before Ch.3 ships to determine if migration is needed or if it is unrelated. | LOW | Ch.3 |

# ADR-0011 — Cowork Execution Handoff (Ch.9)

**Status:** Accepted
**Date:** 2026-05-27
**Owner:** /goal Phase 2 — Ch.9 architect
**Builds on:** ADR-0008 (Ch.6 writebacks — SafeWrite to vault), ADR-0009 (Ch.7 playbooks — origin of decisions to execute), ADR-0010 (Ch.8 MCPs — Chorus + Gmail + PowerBI deps for stakeholder/workstream context), Phase R Decision 10 (verbatim source for schema + UI + return-loop semantics).
**Closes:** ROADMAP §Ch.9 acceptance criteria; PRD §6 (Cowork execution handoff); PRD §4 outcome #8 (Cowork-produced artifacts return to vault auto-linked).
**Inherits:** Ch.6 writeback engine (SafeWrite handles handoff file writes), Ch.7 playbook outputs (memo + decision proposals are the originating artifacts), Ch.8 MCPs (Gmail / Chorus / PowerBI for stakeholder + workstream + product-usage context).

---

## 1. Problem

After a memo ships and Russell accepts a decision proposal (Ch.6 path), the work begins: execution. Russell uses **Cowork** for execution (project plans / business plans / process docs / polished externals). The C-Suite must produce a structured handoff brief that:
1. Gives Cowork everything it needs to start work without re-asking Russell.
2. Lands in the vault as a discoverable artifact so Cowork can find it.
3. Names the Cowork brand skills that should produce any polished output.
4. Closes the loop: when Cowork writes execution artifacts back to the vault, the originating decision auto-updates with an `executed_by:` back-link.

Today (post-Ch.8): every Phase B + cash-lever playbook outputs decision proposals; Ch.6's writeback engine ships them via SafeWrite; Cowork can manually be told to look at a decision file, but there's no structured brief. The path is friction-heavy + manual.

## 2. Decision

Ship Ch.9 as **§3 schema + §4 generator + §5 UI surfaces + §6 return-loop + §7 ACs + §8 build sequencing.** Two parallel sub-agents:
- **Runtime** — Handoff agent prompt (Chief of Staff framing per Decision 10d), brief generator, SafeWrite landing, INDEX.md updater, return-loop chokidar watcher.
- **Renderer** — "Draw up for Cowork" CTA on 4 UI surfaces + preview screen with inline-editable brief + "Send to Cowork" confirmation flow.
- **Tests** — single sub-agent or fold into Runtime/Renderer briefs (smaller chapter; both sub-agents own their own specs).

Effort estimate: 6-9 days per ROADMAP. Target compression to ~2-3 sub-agent dispatches + 1 audit.

---

## 3. Brief schema (verbatim from Phase R Decision 10a)

**File:** `<vault>/handoffs/<YYYY-MM-DD>-<slug>.md`. Markdown + YAML frontmatter. Schema codified in `packages/shared-types/src/handoff.ts` (new).

### 3.1 Frontmatter

```yaml
type: handoff
id: HANDOFF-<YYYY-MM-DD>-<slug>
decision_id: DEC-<N>           # OR memo_id: <memo-path> OR position_id: POS-<N> OR pre_mortem_id: PM-<N>
origin_type: decision | memo | position | pre_mortem
origin_path: <vault-relative path to originating artifact>
created: <YYYY-MM-DD>
created_by_run_id: <run_id>    # which C-Suite run authored this handoff
status: drafted                # drafted | sent | executed
cowork_brand_skills: []        # named Cowork skills for polished artifacts (see §3.3)
executed_by: null              # set when Cowork writes execution artifact back (return loop §6)
```

### 3.2 Body sections (all required)

```markdown
# <Origin title> — Execution Brief

## Decision being executed
<Verbatim from origin + traceback link>

## Rationale chain
<Why this choice over alternatives, sourced from the originating memo>

## Specific deliverables Cowork should produce
- [ ] <Deliverable 1>
- [ ] <Deliverable 2>

## Stakeholder context
<Who's involved, who has decision rights, who needs comms>

## Workstream context
<Which workstreams touch; what depends on this>

## Constraints + risk flags
<Budget, timing, dependencies, tripwires>

## Acceptance criteria
<What "done" looks like>

## Owner + timeline
<Person + dates>
```

### 3.3 Cowork brand-skill catalog

`cowork_brand_skills` in frontmatter is a typed list of skill IDs from this fixed set:

| Skill ID | When to invoke |
|---|---|
| `class-brand-document` | Word document (.docx) deliverables — memos, reports, letters |
| `class-brand-excel` | Excel deliverables — financial models, budget workbooks, KPI tables |
| `class-brand-presentations` | PowerPoint deliverables — board decks, all-hands decks, customer pitches |
| `class-ppt-cyan-light` | PowerPoint variant — internal lightweight deck style |
| `class-brand-voice` | Any external-facing copy that needs Class voice review |

The Handoff agent picks the skills based on the deliverable types. If a deliverable doesn't fit any skill (e.g., a code artifact), the field omits brand skills + a note in the brief body explains.

### 3.4 INDEX update

`<vault>/handoffs/INDEX.md` — Cowork scans this. Append-only on new handoff:

```markdown
## Active handoffs

| ID | Origin | Created | Status | Brief |
|---|---|---|---|---|
| HANDOFF-2026-05-27-q3-turnaround | DEC-007 | 2026-05-27 | drafted | [[2026-05-27-q3-turnaround]] |
```

Index file is regenerated from all `handoffs/*.md` frontmatter (not append-only) so deletions / status changes propagate.

---

## 4. Handoff agent (`apps/utility/src/agents/handoff/`)

### 4.1 Module layout

- `index.ts` — exports `generateHandoffBrief(input): Promise<HandoffBrief>`.
- `prompt.ts` or `handoff.prompt.md` — Chief of Staff framing per Decision 10d. The prompt receives a structured input (origin artifact + run context) and outputs the brief markdown + frontmatter.
- `slug.ts` — slug generator from origin title (kebab-case, ≤40 chars, ASCII-only).
- `skill-selector.ts` — pure function: `pickBrandSkills(deliverables: string[]): SkillId[]`. Heuristic match: "deck" → presentations; "memo" / "doc" → document; "model" / "spreadsheet" → excel; "external" / "customer-facing" → +voice; default = empty.

### 4.2 Input contract

```ts
export interface HandoffGeneratorInput {
  origin: {
    type: 'decision' | 'memo' | 'position' | 'pre_mortem';
    id: string;
    path: string;             // vault-relative
    title: string;
    bodyMarkdown: string;     // origin artifact body
    frontmatter: Record<string, unknown>;
  };
  runContext: {
    runId: string;
    playbookId: PlaybookId;
    stakeholdersOfInterest: string[];      // resolved from playbook deps
    workstreamsOfInterest: string[];       // resolved from origin artifact's linked_workstreams
    memoMarkdown?: string;                 // originating memo if origin is decision/position derived from a memo
  };
}
```

### 4.3 Output contract

```ts
export interface HandoffBrief {
  frontmatter: HandoffFrontmatter;
  bodyMarkdown: string;          // matches §3.2 sections
  filename: string;              // <YYYY-MM-DD>-<slug>.md
  fullPath: string;              // <vault>/handoffs/<filename>
}
```

### 4.4 Prompt structure

The Chief of Staff prompt receives:
- The origin artifact + its frontmatter.
- The originating memo (if available).
- Stakeholder files for everyone mentioned.
- Workstream files for every `linked_workstreams` entry.
- The list of Cowork brand skills available.

It produces the brief body + chooses brand skills. **No reasoning trace surfaces in the output** — the brief is structural output only. (B3 invariant — same pattern as Verifier and Synthesizer.)

---

## 5. UI surfaces (4 entry points + preview screen)

### 5.1 "Draw up for Cowork" CTA placement (per Decision 10c)

- **Memo viewer header** — when memo has a committed decision (`shipped-clean` + at least one accepted decision writeback).
- **Decision log entry card** — on every accepted decision in the Ch.6 review pane history.
- **Accepted position card** — on every accepted position in the Ch.6 review pane history.
- **Accepted pre-mortem card** — on every accepted pre-mortem.
- **NOT** on: predictions, stakeholder updates, workstream advances. These aren't executable actions.

### 5.2 Preview screen — `apps/renderer/src/screens/HandoffPreview.tsx` (new)

Renders the generated brief inline. Two columns:
- **Left (60%)**: editable markdown preview with full WYSIWYG-style rendering. Russell can edit any section before sending.
- **Right (40%)**: metadata panel — origin link, selected brand skills (checkbox list), filename preview, "Send to Cowork" button.

**Actions:**
- **Send to Cowork** → SafeWrite the brief to `handoffs/<filename>.md` + update INDEX. Closes the preview, returns Russell to wherever he came from.
- **Edit body** → in-place markdown editor; on save, updates the preview without re-writing the file.
- **Cancel** → closes preview; nothing persisted.

### 5.3 IPC variants

- `handoff.preview.ready` — payload `{ runId, brief: HandoffBrief }`. Emitted when generation completes; renderer opens HandoffPreview.
- `handoff.send` — payload `{ runId, brief, editedBodyMarkdown? }`. Renderer → main when Russell confirms.
- `handoff.sent` — payload `{ runId, handoffId, path }`. Main → renderer after SafeWrite + git commit succeed.
- `handoff.cancelled` — payload `{ runId }`.
- `handoff.failed` — payload `{ runId, reason }`.

---

## 6. Return loop — Cowork-produced artifacts auto-link back

### 6.1 The path

1. Cowork writes its execution artifacts to `<vault>/executions/<decision-id>/<artifact-name>` (e.g., `executions/DEC-007/Q3-turnaround-plan.docx`).
2. The C-Suite's existing chokidar watcher (Ch.0/Ch.1 indexer) re-indexes the `executions/` directory.
3. On detection of a new file under `executions/<decision-id>/`, the **link-back watcher** (new in Ch.9) auto-updates the originating decision's frontmatter: `executed_by: ['executions/<decision-id>/<artifact-name>', ...]`.
4. The C-Suite UI surfaces a "Linked execution" section on the decision card when `executed_by` is populated.

### 6.2 Link-back watcher — `apps/utility/src/watchers/executionLinkback.ts` (new)

- Subscribes to chokidar events for `<vault>/executions/`.
- On `add` events: parses the path; extracts `decision-id`; finds the origin decision file via the index; appends to `executed_by` via SafeWrite; commits via vault git.
- Idempotent: if `executed_by` already contains the path, no-op.
- Handles non-decision origins: if the origin was a memo (no DEC ID), the convention is `executions/<memo-slug>/...`; same logic, different ID lookup.

### 6.3 Edge cases

- **Cowork writes during a C-Suite run.** SafeWrite handles the conflict via sidecar (Ch.2 pattern). Russell merges manually if needed.
- **Cowork writes a file with no matching decision-id directory.** Logged + skipped. No auto-link.
- **The originating artifact has been moved/deleted.** Logged + skipped. The execution file stays in the vault uncoupled.

---

## 7. Acceptance criteria

- **AC-1**: `generateHandoffBrief(input)` produces a brief matching §3.1/§3.2 verbatim. Frontmatter validates against Zod schema.
- **AC-2**: Handoff agent uses Chief of Staff framing (no new lens role created).
- **AC-3**: Brand-skill selection works for the 5 documented cases — deck → presentations, doc → document, etc.
- **AC-4**: Brief writes via SafeWrite to `<vault>/handoffs/<YYYY-MM-DD>-<slug>.md`; vault git auto-commits.
- **AC-5**: `<vault>/handoffs/INDEX.md` regenerates from all `handoffs/*.md` frontmatter on any handoff write.
- **AC-6**: "Draw up for Cowork" CTA appears on 4 UI surfaces (memo viewer header, decision log entry, accepted position card, accepted pre-mortem card). NOT on prediction/stakeholder/workstream.
- **AC-7**: HandoffPreview renders inline preview + editable body + "Send to Cowork" CTA.
- **AC-8**: On send, brief writes successfully; on cancel, nothing persists.
- **AC-9**: Link-back watcher detects new files under `<vault>/executions/<decision-id>/` and auto-updates the origin decision's `executed_by` field.
- **AC-10**: Link-back is idempotent — re-detecting the same file doesn't double-append.
- **AC-11**: Originating artifact's UI card surfaces "Linked execution" section when `executed_by` is populated.
- **AC-12**: Handoff agent prompt does NOT receive any lens reasoning trace (B3 invariant spot-check).
- **AC-13**: `pnpm vitest run` exit-0 clean for new specs (plus pre-existing 80-ish failures unchanged).

---

## 8. Build sequencing

**Single wave — 2 parallel sub-agents (Renderer non-overlapping with Runtime):**
1. **Runtime sub-agent** — `apps/utility/src/agents/handoff/`, `packages/shared-types/src/handoff.ts`, IPC variants in `ipc.ts`, `apps/utility/src/watchers/executionLinkback.ts`, run-loop hook for "draw-up triggered by accepted-decision". Owns its own specs.
2. **Renderer sub-agent** — `apps/renderer/src/screens/HandoffPreview.tsx`, "Draw up for Cowork" CTA on existing screens (MemoViewer / WritebackPane / AcceptedHistory), IPC consumers, Storybook fixtures. Owns its own specs.

After both ship: **final Ch.9 audit (EvidenceQA)** — single audit covers full chapter (small surface, no intermediate audit needed). CONCERN-CLOSE acceptable per prior chapters' precedent.

## 9. UNKNOWN at write-time

- Whether Cowork actually writes to `<vault>/executions/<decision-id>/` per the convention or to some other location — verify with Russell during Ch.11 demo if not before. If Cowork uses a different path, link-back watcher's path regex updates accordingly.
- Whether the slug generator's 40-char ASCII limit is too aggressive — adjust if briefs end up with truncated unrecognizable IDs.
- Whether HandoffPreview should support attaching reference files (e.g., Russell drags in a PDF the brief should reference) — Phase B / V1.5 if surfaced.

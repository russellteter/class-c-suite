# Ch.9 — Runtime Builder Brief (Handoff Agent + Schema + Link-Back Watcher)

You are the Runtime sub-agent for Ch.9. Contract: `docs/decisions/0011-ch9-cowork-handoff.md` (read fully — especially §3 schema, §4 handoff agent, §6 return loop, §7 ACs).

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Scope (yours alone — non-overlapping with Renderer brief)

### 1. Handoff frontmatter schema — `packages/shared-types/src/handoff.ts` (new)
Per ADR §3.1. Zod schema + TypeScript types: `HandoffFrontmatter`, `HandoffStatus = 'drafted' | 'sent' | 'executed'`, `HandoffOriginType = 'decision' | 'memo' | 'position' | 'pre_mortem'`, `CoworkBrandSkillId = 'class-brand-document' | 'class-brand-excel' | 'class-brand-presentations' | 'class-ppt-cyan-light' | 'class-brand-voice'`. Re-export from `packages/shared-types/src/index.ts`.

Also: `HandoffGeneratorInput` + `HandoffBrief` per ADR §4.2 + §4.3.

### 2. Handoff agent — `apps/utility/src/agents/handoff/`
- `index.ts` — exports `generateHandoffBrief(input: HandoffGeneratorInput): Promise<HandoffBrief>`.
- `handoff.prompt.md` — Chief of Staff framing per Decision 10d. Receives input per §4.2; outputs body markdown matching §3.2 sections verbatim. Reads stakeholder + workstream files when needed via deps passed in input. **No reasoning trace in output** (B3 invariant — same pattern as Verifier/Synthesizer).
- `slug.ts` — pure: `slugify(title: string): string`. Kebab-case + ASCII + ≤40 chars + collision-resistant (append `-2`, `-3` if needed; collision check against existing handoffs/ files).
- `skill-selector.ts` — pure: `pickBrandSkills(deliverables: string[]): CoworkBrandSkillId[]`. Heuristic match per ADR §3.3: "deck"/"slides" → presentations; "doc"/"memo"/"letter" → document; "model"/"spreadsheet"/"xlsx" → excel; "external"/"customer-facing" appends voice. Default = empty array.
- `runner.ts` — orchestrates generation: build prompt input from `HandoffGeneratorInput`, call StubClaudeClient (Opus tier in production), validate output, populate frontmatter, return HandoffBrief.

### 3. Brief writer — `apps/utility/src/agents/handoff/writer.ts`
- `writeHandoffBrief(brief: HandoffBrief, db: Database): Promise<{ ok: true; sha: string } | { ok: false; reason: string }>`.
- Uses existing SafeWrite client. Path: `<vault>/handoffs/<filename>`.
- On success: triggers `regenerateHandoffIndex(db)`.

### 4. INDEX regenerator — `apps/utility/src/agents/handoff/indexRegen.ts`
- Reads all `<vault>/handoffs/*.md`, parses frontmatter, regenerates `<vault>/handoffs/INDEX.md` per ADR §3.4 table format.
- Writes via SafeWrite.
- Idempotent (running twice produces same INDEX).

### 5. Link-back watcher — `apps/utility/src/watchers/executionLinkback.ts` (new)
- Per ADR §6.2.
- Subscribes to chokidar events for `<vault>/executions/`.
- On `add`: extract `decision-id` from path (regex), look up the origin decision file via the Ch.0/Ch.1 indexer, append the file path to `executed_by` array via SafeWrite, commit via vault git.
- Idempotent.
- Handles edge cases per ADR §6.3 (mismatched path, deleted origin) — log + skip.

### 6. IPC variants — `packages/shared-types/src/ipc.ts`
Add the 5 variants per ADR §5.3:
- `handoff.preview.ready` — `{ runId, brief: HandoffBrief }`.
- `handoff.send` — `{ runId, brief, editedBodyMarkdown? }`.
- `handoff.sent` — `{ runId, handoffId, path }`.
- `handoff.cancelled` — `{ runId }`.
- `handoff.failed` — `{ runId, reason }`.

Add `executed_by` to decision/memo/position/pre-mortem frontmatter schemas in `packages/shared-types/src/vault-schemas.ts` if not already present (additive only — should already be there from Ch.7 ADR-0009 §6 / Phase R Decision 4 follow-ups).

### 7. Run-loop hook — `apps/utility/src/orchestrator/run-loop.ts`
Add a hook: when an `accepted` decision writeback IPC event fires (existing Ch.6 event), if Russell's UI explicitly triggers "draw-up" via `handoff.preview.requested`, invoke `generateHandoffBrief` and emit `handoff.preview.ready`. **Important**: do NOT auto-generate on every accepted decision — only on explicit UI trigger. (Spec doesn't say auto; this is decide-and-log.)

### 8. Unit specs — `tests/unit/agents/handoff/`
- `schema.spec.ts` — Zod validation of HandoffFrontmatter for each origin type.
- `slug.spec.ts` — ≥15 cases (kebab conversion, ASCII fallback for unicode, 40-char truncation, collision handling).
- `skill-selector.spec.ts` — each of 5 heuristic cases + multi-deliverable cases + empty default.
- `runner.spec.ts` — generation against StubClaudeClient with seeded output; assert returned HandoffBrief shape.
- `writer.spec.ts` — SafeWrite mock; assert path + git commit message.
- `indexRegen.spec.ts` — given N handoff files, INDEX has N rows; idempotency.
- `executionLinkback.spec.ts` — chokidar mock; assert SafeWrite update of `executed_by` on `add`; assert idempotency.

≥50 specs total.

## Forbidden inferences

- Auto-creating handoffs on every accepted decision — must be explicit user trigger.
- Reading lens reasoning traces in the handoff agent input — B3 invariant.
- Inventing brand-skill IDs not in the 5-skill catalog.
- Bypassing SafeWrite for any vault write.
- Touching `apps/renderer/` (Renderer sub-agent's scope).
- Skipping the auto-link idempotency check.

## What "done" looks like

- All files written + `pnpm -r typecheck` exit-0 clean.
- All existing tests pass.
- ≥50 new specs across the handoff + watcher tree.
- `grep -rn "from '@c-suite/shared-types/handoff'" apps/utility/src/` returns hits.
- Atomic commits — `ch.9 runtime: <what> — <why>`. No Claude attribution.

## Report-back (≤250 words)
- Commits + first-line.
- Typecheck + vitest results.
- Any contract ambiguity resolved.
- Any blocker hit + three approaches tried.

DO NOT touch renderer. DO NOT close Ch.9.

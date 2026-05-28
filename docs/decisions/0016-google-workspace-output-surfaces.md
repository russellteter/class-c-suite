# ADR-0016: Google Workspace Output Surfaces

## Status

`accepted`

## Date

2026-05-28

## Context

C-Suite playbooks produce a markdown memo plus structured lens outputs. Some playbook outputs map naturally to Workspace artifacts: a cap-table or allocation model is better consumed as a Google Sheet; a board deck skeleton is better consumed as a Google Slides deck; a full option memo with rich formatting is better consumed as a Google Doc.

Russell enabled Drive, Docs, Sheets, and Slides APIs on the same Google OAuth app as Gmail (Drive scope `drive.file` gates the other three). We need to:

1. Surface those artifacts as typed `OutputSurface` metadata on `PlaybookResult`, so the renderer (TRACK 6) can link to them.
2. Keep the credential surface minimal — one OAuth grant, one vault entry (`'gmail'`), expanded scopes.
3. Avoid forcing playbook modules to know about Google APIs directly.

Relevant ROADMAP chapter: Ch.10 (MCP integration hardening + tracks). BLOCKERS: none blocking this ADR. DOCTRINE law #2 (verify before claiming done) governs the BUILD-COMPLETE-VERIFY-PENDING-CREDS end state.

## Decision

Add an `OutputSurface` union type and `outputSurfaces?: OutputSurface[]` field to `PlaybookResult` (append-only). Add typed wrappers at `apps/utility/src/mcp/google-workspace/`. Produce artifacts in playbook orchestration code post-Synthesizer (not as LLM tool calls) based on a per-playbook config map. Reuse the `'gmail'` vault entry — the refresh token is the same credential; expanded scopes are added to `GMAIL_SCOPE` in `gmail/oauth-flow.ts`. Wrappers instantiate `google.auth.OAuth2` and call `setCredentials({ refresh_token })` directly via the `googleapis` npm client.

## Rationale

**Credential reuse over a new vault entry.** Russell has one Google OAuth app. A second `McpServiceId` entry ('google_workspace') would require a separate consent flow, separate vault key, and separate scope management — no benefit, extra surface area. The `'gmail'` entry holds the refresh token; expanding its scopes in the same flow is cheaper and less error-prone.

**Orchestration code calls wrappers, not LLM.** Wiring wrappers as Anthropic tool_use calls to the Synthesizer would require schema registration, prompt injection, and error recovery inside the LLM loop. Orchestration code calling wrappers post-Synthesizer is deterministic, testable in isolation, and avoids entangling the memo quality path with Google API latency.

**`googleapis` over `fetch`.** The `googleapis` npm package handles OAuth token refresh, retry-safe request construction, and full TypeScript types for Docs/Sheets/Slides/Drive v4 APIs. Hand-rolling REST calls is fragile and slower to maintain.

**`OutputSurface` in `playbook.ts`, not a new file.** The type lives alongside `DegradationWarning` — it is part of the same PlaybookResult extension pattern. APPEND-only keeps backward compatibility.

DOCTRINE law #6: creativity within guardrails. Reusing the Gmail credential path is the minimal-blast-radius option. DOCTRINE law #5: use the full toolbox — `googleapis` is the canonical client.

## Considered options

- **Option A** (chosen) — Reuse `'gmail'` vault entry, expand scopes, wrappers in orchestration code, `googleapis` client. Chosen for minimal credential surface and deterministic artifact creation.
- **Option B** — New `McpServiceId = 'google_workspace'`, separate consent flow. Rejected: two vault entries for one OAuth app; double the setup friction for Russell.
- **Option C** — Wrappers as Synthesizer LLM tool calls. Rejected: entangles memo quality path with Google API latency + error modes; non-deterministic; harder to test.
- **Option D** — `node-fetch` + REST manually. Rejected: more code, no type safety, reimplements token refresh already handled by `googleapis`.

## Consequences

- Positive: Russell gets shareable Google artifacts alongside memos for cap-table / deck / option-memo playbooks.
- Positive: Single OAuth consent covers Gmail + Workspace in one flow.
- Positive: `OutputSurface` on `PlaybookResult` gives TRACK 6 a typed contract to render links without needing to know about Google APIs.
- Negative / costs: `googleapis` adds ~3 MB to the utility bundle (npm install is still fast; tree-shaking at build time).
- Negative / costs: Artifact creation runs post-Synthesizer, not in parallel with memo generation. Parallel would need a separate pipeline leg — deferred to a future chapter.
- Follow-up work: TRACK 6 renders `outputSurfaces[]` as link badges in the memo viewer. First-launch Connect flow must succeed (Russell action) to populate the expanded scopes.
- Reversibility: high — remove `outputSurfaces` field (optional, so all consumers still compile) and delete the wrappers directory.

## Affected artifacts

- `packages/shared-types/src/playbook.ts` — append `OutputSurface` type + Zod schema + `outputSurfaces` field on `PlaybookResultSchema`
- `apps/utility/src/mcp/gmail/oauth-flow.ts` — expand `GMAIL_SCOPE` to include `drive.file`, `documents`, `spreadsheets`, `presentations`
- `apps/utility/src/mcp/google-workspace/` (new) — `docs.ts`, `sheets.ts`, `slides.ts`, `drive.ts`, `auth.ts`, `index.ts`
- `apps/utility/src/playbooks/lib/outputSurfaceDefaults.ts` (new) — per-playbook default surfaces config
- `apps/utility/src/prompts/Synthesizer.prompt.md` — additive section noting parallel Workspace artifact emission
- `apps/utility/src/prompts/Handoff.prompt.md` — additive section for referencing artifact URLs in execution briefs
- `apps/utility/package.json` + `pnpm-lock.yaml` — add `googleapis`
- Related ADRs: ADR-0010 (Ch.8 MCP integration), ADR-0015 (NetSuite OAuth migration, shared token store pattern)

## Tripwires

- Google returns `insufficient_scope` on artifact creation → scope expansion in `GMAIL_SCOPE` was not picked up; user must re-run the Connect flow with `prompt=consent`.
- `googleapis` major version bump changes `google.auth.OAuth2` API → update wrappers to new client API.
- `PlaybookResult.outputSurfaces` field appears in IPC messages — if IPC payloads are size-constrained, strip `url` before emitting over IPC and fetch on demand.

---

**Author / agent role:** Backend Architect (TRACK 5)
**Reviewed by Audit/QA in chapter ritual step 6:** 2026-05-28

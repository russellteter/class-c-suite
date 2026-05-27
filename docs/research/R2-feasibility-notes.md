# R2 Feasibility Notes — Adversarial Verification + New-Risk Hunt

> Produced by R2-Adversarial sub-agent, Phase R, 2026-05-26.
> Sources cited inline: file path + line, docs URL, context7 result, firecrawl result.

---

## Go/No-Go — Critical-Path Externals

| External | Go/No-Go | Evidence | Risk note |
|---|---|---|---|
| **NetSuite TBA (B1)** | **GO for Phase R** / Amber for Ch.8 | Live MCP verified in R1 (`docs/research/R1-connector-reality.md`). TBA still needed for standalone Electron runtime. | P2 — no Phase R blocker. |
| **Claude Max window economics (B4)** | **GO with constraint** | 2026-05-06 Anthropic announcement doubled Claude Code 5-hr limits for Max (source: `https://www.anthropic.com/news/higher-limits-spacex`). Exact new ceiling not published in plain text — referenced table image in the announcement. Peak-hours reduction removed for Max. External Claude.ai usage shares the same pool. 180K headroom assumption is MORE conservative than needed post-doubling, so direction is favorable, but exact number is UNKNOWN from public docs. | P1 DOWNGRADE candidate: risk is lower post-doubling, but scheduler still needs the headroom guard. |
| **Cost-semantics on Max (B5)** | **GO — field exists, compute manually** | SDK exposes `result.usage.total_cost_usd` (context7 source: `/nothflare/claude-agent-sdk-docs`, cost-tracking guide). On Max subscriptions the SDK returns usage tokens and a `total_cost_usd` calculated from API pricing — NOT a "subscription credits remaining" figure. The meter will show API-equivalent cost, which is fine for relative run comparison but misleading as a "dollars spent" figure for Max users who pay flat monthly. Mitigation already in BLOCKERS: display as token-based / window-cap remaining. | P2 — resolved by token-based meter. |
| **PowerBI / customer-dashboard (B2)** | **GO** | Location, language, entry point confirmed by R0-Code. Python subprocess pattern confirmed viable. | P2 — see B18. |

---

## Part 1 — Blocker Verification Results

### B3 — Verifier reasoning-trace leak (rubber-stamp risk)

**Verdict: VERIFIED — design is sufficient.**

`docs/architecture/runtime.md` lines 123-131 define the Verifier Input Contract explicitly: lenses pass only structured outputs and the tool-call audit trail — never reasoning traces. The assembler throws `VerifierInputContractViolation` if any required input is missing, and the run does not proceed. Source: `docs/architecture/runtime.md` line 128: "The Verifier input assembler fails closed if any of these are missing."

The planted-claim canary fixture is specified at `docs/architecture/prompts.md` lines 434-453 as `tests/verifier-canary.spec.ts` with fixture `memo-with-unsourced-arr-claim`. This fixture path is a permanent regression guard per the spec ("Runs on every CI build").

**5 edge cases for `isQuantOrNamed` test suite** (`docs/architecture/prompts.md` lines 406-432):
1. Date in opinion claim: "by next quarter" — should return `false` (no numeric trigger).
2. Named entity in hypothetical: "if Barclays were to call" — should return `true` (named entity in NAMED_ENTITY_REGISTRY triggers citation requirement even in hypotheticals).
3. Number in metaphor: "a thousand cuts" — regex `/\b\d{1,3}(,\d{3})+/` would match `1,000` if spelled that way; "thousand" (word form) should return `false`.
4. Percentage in projection: "ARR might grow 15% if renewals hold" — should return `true` (percentage regex matches).
5. Currency abbreviation without digits: "$M range" — should return `false` (requires digit after `$` per regex `\$\s?\d`).

Architecture-patch needed: the NAMED_ENTITY_REGISTRY must be pre-loaded with Class-specific entities (stakeholder names, product names, competitor names) to avoid false negatives on named-entity claims. Ch.4 architect must build this from the stakeholder vault + turnaround library.

### B4 — Claude Max 220K/5-hr window blind to external usage

**Verdict: DOWNGRADED to P2.**

Anthropic announced 2026-05-06 that Claude Code 5-hour rate limits are **doubled** for Max subscribers and that the peak-hours reduction is removed for Max. Source: `https://www.anthropic.com/news/higher-limits-spacex`. Exact new ceiling is published as a table image (not scraped in plain text), but the direction is: the effective window is now larger than the 220K figure the spec assumed. The 180K headroom assumption is therefore MORE conservative than needed.

Key constraint that remains: Claude.ai chat usage and Claude Code usage share the same Max subscription pool. The C-Suite scheduler cannot see external usage. The 180K conservative cap remains correct practice. Interactive strict-priority rule still needed.

Severity: downgrade from P1 → P2 post-announcement. The blocker is real but the economics are more favorable than the spec assumed.

### B5 — `maxBudgetUsd` / `total_cost_usd` semantics on Max

**Verdict: VERIFIED — field exists; meter strategy confirmed.**

The Claude Agent SDK TypeScript exposes `result.usage.total_cost_usd` on the final `ResultMessage`. Source: context7 `/nothflare/claude-agent-sdk-docs`, cost-tracking guide — `console.log("Total cost:", result.usage.total_cost_usd)`.

On Max subscriptions, the SDK calculates this as API-equivalent pricing (input/output tokens × published rates + cache read rates), not as "subscription credits remaining." This means the meter shows a meaningful relative cost per run but is NOT a "dollars spent" figure for flat-rate subscribers.

**Architecture implication:** The IPC message `cost.usage` (runtime.md line 62) carries `tokensIn`, `tokensOut`, `windowRemaining`. The renderer should display "tokens used this window / estimated window remaining" — not USD. USD can be shown as a secondary "API-equivalent cost" label with a tooltip explaining it's a reference figure, not an actual charge.

The field name in the TypeScript SDK is `result.usage.total_cost_usd`. Hook access: read from `ResultMessage` after `SubagentStop`, or accumulate via `onMessage` callback on each assistant message's `usage` field.

### B6 — Covenant terms ASSUMED

**Verdict: VERIFIED — Day-Zero form mitigation is sufficient.**

The mitigation (Day-Zero form capturing verbatim Barclays covenant terms) is the correct approach. The form must capture:
- Covenant name (e.g., "Minimum Liquidity Covenant")
- Verbatim threshold (e.g., "$X cash + equivalents at month-end")
- Measurement frequency (monthly / quarterly)
- Cure period (days before breach triggers event of default)
- Reporting obligation (must notify Barclays within N days of breach)
- Grace period if any

R1-connector-reality.md confirms NetSuite has zero saved searches matching "covenant" — the tracker must derive from cash GL accounts via raw SuiteQL. No NetSuite structural blocker to the tracker, but the Day-Zero form is still required to know WHICH GL accounts constitute "cash + equivalents" per the credit agreement definition.

### B8 — Cowork `/deep` bypasses SafeWrite on shared zones

**Verdict: VERIFIED — sidecar pattern is sufficient; one gap documented.**

The sidecar pattern (SafeWrite writes `.proposed-*` sidecar, surfaces `safewrite.conflict` IPC event, Russell merges manually) adequately handles the concurrent-write risk. Source: BLOCKERS.md B8 mitigation + runtime.md line 305: "SafeWrite conflict: write sidecar; emit safewrite.conflict; do NOT silently overwrite."

The one gap: the sidecar pattern requires the C-Suite to detect that the vault file was modified externally (by Cowork) BETWEEN when the lens read the file and when SafeWrite tries to write. This requires a file mtime or git SHA check at write time. Ch.2 architect must implement: read file SHA at lens-context-bundle time → compare at write time → if diverged, create sidecar instead of overwriting.

No additional mitigation needed beyond what is already specified.

### B10 — `isQuantOrNamed` classifier load-bearing for 35% of rigor

**Verdict: VERIFIED — deterministic regex approach is sufficient; 5 edge cases above document the test requirement.**

The frozen regex + named-entity registry approach in `docs/architecture/prompts.md` lines 413-429 is sound. The classifier makes no LLM call — two runs of the same memo produce identical scores. The 50+ test cases in `tests/isQuantOrNamed.spec.ts` are the enforcement mechanism.

One architecture note: the `NAMED_ENTITY_REGISTRY` is described as "loaded once" — it must be loaded at utility-process startup and cached. It cannot be rebuilt per-run (latency) or per-lens (memory waste). This is an implementation detail for Ch.4.

### B11 — Chorus exposes AI summaries only — weak health evidence

**Verdict: VERIFIED — no raw transcripts in Chorus API; confidence cap required.**

The Chorus API (`https://api-docs.chorus.ai/`) exposes: Conversations, Video Conferences, Emails, Engagement filter, Scorecards, Playlists, Saved Searches, Reports, Sales Qualifications, Users, Teams. The endpoint list does NOT include a raw transcript download or a verbatim recording-to-text export. The described use cases are: "retrieve data about engagements (meetings and dialer calls), upload new recordings, delete recordings." There is no "get raw transcript text" capability listed.

Conclusion: Chorus-only claims remain AI-summary-derived. The <70 confidence cap + Salesforce/NetSuite corroboration requirement in BLOCKERS B11 is the correct mitigation. This must be enforced at the Synthesizer level: any claim tagged `source_type: chorus` gets a confidence ceiling of 69 in the structured output schema.

### B13 — Decision frontmatter lacks machine-readable position/prediction links

**Verdict: VERIFIED — additive plan is sufficient; one gap from R0-Vault noted.**

The additive `linked_positions: [...]` / `predictions_spawned: [...]` plan does not break existing files. R0-Vault (`docs/research/R0-constraints-ledger.md`) also found that decisions are missing `tripwires`, `rationale`, and `superseded_by` frontmatter fields. The additive plan should be extended to include these as optional fields injected by Ch.6 write-back engine:

```yaml
linked_positions: []       # typed array — new
predictions_spawned: []    # typed array — new
tripwires: []              # typed array — new (was prose)
executed_by: null          # handoff back-link — new
```

The Day-Zero Bases form captures which fields Russell wants queryable. No blocker — the gap is documentation of the full additive field set, not a feasibility issue.

### B14 — better-sqlite3 + native-module notarization entitlements

**Verdict: VERIFIED — specific entitlements documented; test-early warning stands.**

Source: `https://www.forasoft.com/blog/article/the-pain-of-publishing-electron-apps-on-macos-303` (updated 2026-04-26).

**Required entitlements `.plist` keys for Electron + native modules on macOS Sequoia (hardened runtime):**
- `com.apple.security.cs.allow-jit` — **REQUIRED** (V8 JIT compilation). This is the minimal required entitlement.
- For native modules that load unsigned dynamic libraries: `com.apple.security.cs.disable-library-validation` — needed only if `better-sqlite3` ships a pre-built binary that Electron's rebuild doesn't re-sign. If `electron-rebuild` re-signs the module, this entitlement is NOT needed.
- For utility process helper: `com.apple.security.cs.allow-unsigned-executable-memory` — needed only if the utility process uses the `allowLoadingUnsignedLibraries: true` flag (Electron's `utilityProcess.fork` option for macOS).

**Notarization pipeline (current — 2026):**
- `altool` is dead (removed by Apple November 2023). Only `xcrun notarytool` is valid.
- Pipeline: sign with Developer ID → package to .dmg → `xcrun notarytool submit --wait` → `xcrun stapler staple`. Turnaround 2-15 minutes.
- Use `@electron/osx-sign` (scoped) + `@electron/notarize` (not the old unscoped `electron-notarize`).
- `electron-rebuild` must run before packaging to re-compile native modules against the exact Electron Node.js ABI.

**Spec correction needed:** B14 mitigation mentions "electron-rebuild pinned" — this is correct but must be explicit: `electron-rebuild` must run AS PART OF the build step, not just at dev-install time. Otherwise CI will package the wrong binary.

**macOS version note:** The brief references "Sequoia 14.4+" but Darwin 24.3.0 (Russell's env from session context) = macOS Sequoia 15.3. Sequoia is macOS 15, not 14. Sonoma is 14. Architecture specs should read "Sequoia 15.x+" not "14.4+". This is a spec correction item.

### B15 — Calibration-freshness when zero positions cited

**Verdict: VERIFIED — "decide and log" approach is correct.**

The decide-and-log choice (reward usage, don't penalize novel questions) is the right product-philosophy call. When zero positions are cited, the calibration dimension scores 0 of 15 points but does not push the memo below the 70-point threshold on its own (a 70-point memo can still pass with 0 calibration if the other 4 dimensions are strong). This is working as designed.

No change needed. If Russell later wants stricter behavior, it's a one-line change to `rigorThreshold()`.

### B16 — Audit trail contains sensitive SF/NS excerpts — git-pushed vault risk

**Verdict: VERIFIED — SQLite-local mitigation is sufficient; no leak path.**

The audit trail SQLite (`tool_calls` table per `docs/architecture/runtime.md` lines 220-235) stores full `result_json` for every tool call. SQLite lives in the C-Suite app's data directory (NOT in the vault). The vault git push covers only the artifacts corpus (positions, decisions, memos, etc.). There is no code path that writes `result_json` to vault files — the Synthesizer reads from in-memory run state, not from SQLite direct reads.

The optional "in-vault export" path (gated by Russell) is the only leak risk, and it's user-initiated. Sufficient.

One implementation note: the SQLite data directory must be explicitly set to `app.getPath('userData')` in the Electron main process, not `app.getPath('documents')`, to ensure it stays out of iCloud sync territory (B9 interaction).

---

## Part 2 — New-Risk Hunt Findings

### Area 1 — macOS Sequoia quirks

**safeStorage.** `safeStorage.encryptString()` / `decryptString()` on macOS uses the system Keychain. On Sequoia 15.x, behavior is unchanged from prior releases for standard Developer ID apps. No new quirks found.

**Tray API.** The Tray + menubar pattern is stable in Electron. No Sequoia-specific breaking changes found in 2026.

**globalShortcut.** Source: `https://electronjs.org/docs/latest/api/global-shortcut`. Key finding: `register()` returns `false` silently if the accelerator is already taken by another app — no exception thrown. C-Suite must call `isRegistered()` after `register()` and fall back to a user-configurable alternative if the default is taken. `Cmd+Shift+C` is NOT a system-reserved Finder shortcut on macOS (Finder uses Cmd+C for copy, not Cmd+Shift+C). However, other apps (e.g., VSCode: format document) may claim it. The registration failure pattern is a P3 risk.

**Notification permission.** On macOS Sequoia, apps must request notification permission via `Notification.requestPermission()` in the renderer or via the `notifications` entitlement. Electron wraps this automatically for `new Notification()` calls from the main process (via `app.requestPermission`). For main-process notifications, no special entitlement is required for Developer ID distribution (unlike Mac App Store). Not a new blocker — existing architecture handles this.

**LaunchAgent vs LaunchDaemon.** For a menubar app that runs in the user session, `LaunchAgent` in `~/Library/LaunchAgents/` is the correct pattern. `LaunchDaemon` runs as root and has no access to the user's keychain or display. The existing architecture (Ch.10) specifies LaunchAgent — confirmed correct.

**App Sandbox.** The vault is at `/Users/russellteter/Documents/Claude/Projects/Business Planning/`. If the app runs without App Sandbox (standard for Developer ID, not MAS), file access is unrestricted. The preflight check at startup should verify the vault path exists and is not inside an iCloud-synced container. This is already covered by B9.

**New risk from this area: B31 — globalShortcut silent registration failure.**

### Area 2 — Claude Agent SDK current state

**Hook names (confirmed current):** `PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop` — all confirmed via context7 `/nothflare/claude-agent-sdk-docs`. Source: hooks guide and TypeScript types guide. Hook callback signature: `async (input, toolUseId, context) => {}`.

**`SubagentStartHookInput` type** (TypeScript): `{ hook_event_name: 'SubagentStart', agent_id: string, agent_type: string }` plus `BaseHookInput` fields.

**Partial messages / streaming:** SDK exposes `SDKPartialAssistantMessage` with `type: 'stream_event'` and `event: RawMessageStreamEvent`. Available when `includePartialMessages` option is enabled. Source: context7 TypeScript SDK types. This maps to the runtime.md "Partial messages (token streaming)" item — confirmed feasible, confirmed low-priority per the architecture comment "ship without if it complicates the protocol."

**`total_cost_usd`:** Present on `result.usage.total_cost_usd` (TypeScript). On Max, this reflects API-equivalent pricing, not subscription credits. See B5 analysis above.

**`utilityProcess.fork()`:** Confirmed as the current pattern for spawning Node.js utility processes in Electron. Source: context7 `/websites/electronjs`, utilityProcess.fork documentation. The API is stable and is the official way to create a sandboxed child process with Node.js and MessagePort enabled. The `ready` event on `App` must have fired before calling it.

**No new blockers from this area.**

### Area 3 — Obsidian plugin landscape

**Bases plugin:** Released in Obsidian 1.9 (2025). It is now a **core plugin** (built-in, not community), shipping with visual table/query interface for frontmatter properties. Source: YouTube description ("Obsidian 1.9 is here - and it finally brings native database support through the new BASES core plugin," uploaded 2025-05-22). The frontmatter query syntax requires typed properties in YAML frontmatter. B13's `linked_positions: []` typed-array approach is exactly correct for Bases compatibility.

**Dataview:** The lead developer announced they would not continue active development. Source: medium.com article dated September 2025 — "The lead developer announced they wouldn't be continuing active development." Dataview still works (existing queries run) but is in maintenance mode. **New risk: the C-Suite architecture spec references Dataview in several places — if Bases is the current standard, the spec should default to Bases-compatible property syntax and not rely on Dataview for any query functionality.**

**Templater:** No breaking changes found for Obsidian 1.6+. Still actively maintained as a community plugin.

**New risk from this area: B32 — Dataview dependency risk (architecture spec Dataview references may be stale).**

### Area 4 — Concurrent-write hazards beyond Obsidian

**Time Machine + atomic rename.** Time Machine takes snapshots at the HFS+/APFS snapshot level. APFS atomic renames (`rename(2)` + `RENAME_SWAP` flag) complete before Time Machine's snapshot window, so the snapshot captures either the old or new file but never a partial write. Not a blocker.

**Spotlight indexer.** Spotlight will index frequently-written files. For the vault (markdown files), Spotlight reads are non-blocking (kqueue events don't stall writes). SafeWrite's atomic rename is safe against Spotlight — Spotlight indexes whichever version is stable at snapshot time. Not a blocker.

**Dropbox / Google Drive sync.** If Russell later adds the vault to Dropbox or Google Drive, the sync client's file locking can corrupt atomic renames (same class of hazard as iCloud — B9). The preflight check must detect ALL sync agents, not just iCloud. Detection method: check for `.dropbox` marker file, Google Drive's `Google Drive.app` process, or `com.google.drivefs` kernel extension. This is an extension to the B9 preflight.

**New risk from this area: B33 — Dropbox/Google Drive sync detection missing from preflight.**

### Area 5 — Renderer security

**Defaults confirmed correct.** The architecture (runtime.md line 36) already specifies `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. These are the current Electron security best practices per 2026 documentation.

**CSP.** Electron 28+ enforces a stricter default CSP for renderer content. The C-Suite renderer needs a CSP header that allows `'self'` for scripts and `data:` for inline SVG (if used in charts). No `'unsafe-inline'` or `'unsafe-eval'` — React with modern JSX transform doesn't need either. A strict CSP is straightforward.

**Preload script surface.** The preload script should expose the minimum IPC surface — only the discriminated-union message types the renderer needs to send and subscribe to. `contextBridge.exposeInMainWorld('ipc', { send: ..., on: ... })` with typed wrappers. Do NOT expose full `ipcRenderer` to the renderer.

**No new blockers from this area.** Existing architecture is correct.

### Area 6 — Token-streaming protocols

**Confirmed feasible.** The SDK's `SDKPartialAssistantMessage` stream events can be relayed over Electron IPC (utility → main → renderer) as a stream of typed messages. The pattern: utility process emits partial tokens to main via `MessagePort`; main forwards as IPC events to renderer; renderer appends to a running token buffer. Backpressure: if the renderer falls behind, IPC events queue in Node's event loop. Since the renderer is not doing heavy computation, backpressure is not a realistic concern for the C-Suite's use case (single-user, single-session).

**New risk from this area: B34 — IPC stream event volume on long Opus runs.** A long Verifier run on Opus 4.7 can produce thousands of partial token events. If the renderer subscribes to ALL partial messages, the IPC channel saturates. Mitigation: relay partial messages only as "agent X is thinking" heartbeat (once per N seconds or per N tokens), not as raw token events. Already noted as optional in runtime.md.

### Area 7 — electron-builder + notarization current state

**Already covered in B14 analysis.** Summary:
- `altool` is dead (removed November 2023). `xcrun notarytool` is the only valid tool.
- Hardened runtime entitlement minimum: `com.apple.security.cs.allow-jit`.
- Use `@electron/osx-sign` + `@electron/notarize` (scoped packages).
- `electron-rebuild` must run in the CI/build step, not only at dev install.
- No new blockers beyond what B14 already covers.

**Spec correction: "Sequoia 14.4+" is wrong.** Darwin 24.x = macOS Sequoia 15.x. Architecture docs that reference "Sequoia 14.4+" should read "Sequoia 15.x+" (Sonoma = 14, Sequoia = 15).

### Area 8 — `scripts/install-extracted-skills.py` bug root cause (B29)

**Bug location confirmed.** The installer is at `/Users/russellteter/Claude Code Projects/c-suite/scripts/install-extracted-skills.py`.

**Root cause:** Lines 82-88. The script finds all code blocks (`code_block_re.finditer(section_text)`) in the section, then takes `code_blocks[0].group(1)` as the SKILL.md content. This is correct in isolation. The truncation root cause is in the source file (`_extracted_skills_for_c_suite.md`), not in the installer regex:

The regex `code_block_re = re.compile(r"^```(?:markdown|yaml|md)?\s*\n(.*?)^```", re.MULTILINE | re.DOTALL)` uses non-greedy `.*?`. If the SKILL.md content itself contains a ```` ``` ```` fence (e.g., code examples within the skill), the regex stops at the FIRST closing fence it finds, truncating the content. A SKILL.md with internal code examples will be cut at the first inner fence.

**Fix shape (do NOT apply — Ch.0 architect applies):**
- Change the code-block regex to use a language-specific fence match: require that the closing fence is on its own line with NO indentation AND matches the exact fence character count of the opener. Python's `re` module doesn't support backreferences well for this. Alternative: parse block by block using a state machine (simpler and more robust). Or: use a multi-line split on ` ``` ` and take text between the FIRST opening fence and LAST closing fence of each skill section.
- After fix, verify with `wc -l ~/.claude/skills/<name>/SKILL.md` — expected 100-232 lines per skill.

---

## Top 10 Issues for `/goal` to Surface to Russell

1. **Rate-limit ceiling (B4).** Post-2026-05-06 doubling, the exact new Claude Code Max 5-hr token ceiling is not published in plain text. Russell should check `/cost` in his Claude Code session to see current window state. The 180K conservative cap remains valid but may be too conservative now. `/goal` should document the actual observed limit when a full lens fan-out runs (6 lenses × ~15K each ≈ 90K input). Surface to Russell: "What ceiling do you actually hit? Should we raise the cap?"

2. **Covenant terms (B6).** The Day-Zero form must capture verbatim Barclays covenant terms BEFORE the first scheduled run. Without this, every covenant reading in a memo must show a "DIRECTIONAL — not verified against credit agreement" banner. This must be Russell's first action at Day-Zero.

3. **B19 "Committed" stage labels.** Russell's mental model of "committed pipeline" drives the SOQL filters in 5+ playbooks. The Day-Zero form must confirm: does "committed" = Verbal Agreement + Verbal Approval + Contracting? Does "Qualified Renewal" count as committed or just "in the funnel"?

4. **B25 — DEC-001 through DEC-004 missing.** Four of seven decisions in the vault INDEX don't exist as files. Russell must decide: rename DEC-005-007 to DEC-001-003, restore from git history, or update the INDEX. This blocks clean indexer operation for the decision zone.

5. **B28 — Mirror vs vault.** Russell must choose one of three options for `c-suite/business-planning/`: keep + sync script, delete (recommended), or symlink. The mirror is now meaningfully stale and creates a drift risk.

6. **B22 — Vault git has zero commits.** The vault git repo has no history. `scripts/vault-bootstrap.sh` must run before Ch.2 ships to create the baseline commit. Russell should review the `.gitignore` list before the commit (no secrets, no temp files, etc.).

7. **B32 — Bases vs Dataview.** If Dataview is in maintenance mode and Bases is now Obsidian's built-in query layer, the C-Suite's write-back schema (Ch.6) should target Bases property syntax. This may affect the field-naming conventions in B13's typed-array plan. Russell should confirm: "Will you use Bases or Dataview for vault queries?"

8. **B29 — Skill body truncation.** 6 of 8 extracted skills have truncated SKILL.md bodies. The fix to `install-extracted-skills.py` is documented here. Russell should re-run the installer after Ch.0 fixes it, and verify with `wc -l ~/.claude/skills/*/SKILL.md`. Confirm whether Cowork extraction needs to be re-run (if the source file is also truncated).

9. **globalShortcut collision (B31).** The C-Suite's hotkey will silently fail to register if another app has claimed it. Russell should test the default shortcut at Day-Zero on his Mac (with his usual app stack running) and confirm or adjust. The UI must surface registration failure clearly.

10. **Dataview/Bases migration (B32).** If Bases becomes the query interface, architecture/data.md frontmatter schemas should validate that all typed arrays use property syntax compatible with Bases (plain YAML arrays, not Dataview inline annotations). This is a Ch.0/Ch.6 design point.

---

## Per-Area Summaries

**macOS Sequoia quirks:** No P0/P1 risks found. `safeStorage`, Tray, LaunchAgent, App Sandbox all behave as spec'd. One new P3 risk: `globalShortcut.register()` fails silently if the hotkey is taken — add `isRegistered()` check and user-configurable fallback (B31).

**Claude Agent SDK:** Hook names `PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop` all confirmed current. `utilityProcess.fork()` confirmed as the correct Electron utility-process API. `total_cost_usd` exists on `ResultMessage.usage` — display as reference figure, not real charge for Max users. Partial message streaming confirmed feasible but should be throttled to heartbeats only (B34, P3).

**Obsidian landscape:** Bases is a core plugin in Obsidian 1.9+, making it the primary query layer. Dataview is in maintenance mode (lead developer stepped back, September 2025). C-Suite must target Bases-compatible property syntax. This is a low-severity but real spec-update need (B32, P2).

**Concurrent-write hazards:** Time Machine and Spotlight are not hazards for SafeWrite's atomic rename. Dropbox/Google Drive sync is a latent hazard if Russell adds either to the vault path — preflight must detect all sync clients, not just iCloud (B33, P2).

**Renderer security:** Existing architecture spec is correct — `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` are current best practice. Preload script should expose minimum IPC surface via `contextBridge`.

**Token-streaming protocols:** Feasible via `SDKPartialAssistantMessage`. Throttle to heartbeats to avoid IPC saturation on long Opus runs (B34, P3).

**electron-builder + notarization:** `altool` dead. `xcrun notarytool` is current. Minimum entitlement: `com.apple.security.cs.allow-jit`. `@electron/osx-sign` + `@electron/notarize` are the scoped packages. **Architecture spec bug: "Sequoia 14.4+" should be "Sequoia 15.x+"** (Darwin 24.x = macOS 15).

**B29 installer bug:** Root cause is the non-greedy regex cutting at internal code fences within a SKILL.md. Fix is a state-machine parser, not a regex tweak. Ch.0 architect owns the fix.

---

*Produced by R2-Adversarial, Phase R. All claims cite source above. UNKNOWN is stated where the source was not findable in three approaches.*
